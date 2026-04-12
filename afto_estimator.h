/*
 * AFTO — Adaptive Flux-Thermal Observer
 * Embedded C Implementation for STM32G4 MCU
 * ==========================================
 * Varroc Eureka Challenge — PM Temperature Estimation in PMSM
 * 
 * This file implements the complete AFTO estimation pipeline:
 *   1. Flux Observer (ψ_m extraction → T_mag,A)
 *   2. 4-Node LPTN Thermal Model (→ T_mag,B)
 *   3. Extended Kalman Filter (speed-adaptive fusion)
 *   4. Edge-AI MLP Correction (residual learning, adopted from deep-pmsm)
 *
 * Target: STM32G4 @ 170 MHz, ARM Cortex-M4F
 * Execution time: < 50 µs per cycle
 * Memory: < 4 KB RAM, < 8 KB Flash
 */

#ifndef AFTO_ESTIMATOR_H
#define AFTO_ESTIMATOR_H

#include <math.h>
#include <stdint.h>

/* ================================================================
 * MOTOR PARAMETERS (calibrate for your specific motor)
 * ================================================================ */
#define AFTO_RS_REF         0.015f      /* Stator resistance at 20°C [Ohm] */
#define AFTO_LD             0.3e-3f     /* d-axis inductance [H] */
#define AFTO_LQ             0.7e-3f     /* q-axis inductance [H] */
#define AFTO_PSI_M_REF      0.07f       /* PM flux linkage at 20°C [Wb] */
#define AFTO_ALPHA_PSI      (-0.0011f)  /* Flux temp coefficient [/°C] */
#define AFTO_ALPHA_CU       0.00393f    /* Copper temp coefficient [/°C] */
#define AFTO_T_REF          20.0f       /* Reference temperature [°C] */
#define AFTO_POLE_PAIRS     4           /* Number of pole pairs */

/* Thermal network parameters */
#define AFTO_C1     800.0f      /* Winding thermal capacitance [J/°C] */
#define AFTO_C2     2500.0f     /* Iron thermal capacitance [J/°C] */
#define AFTO_C3     600.0f      /* Rotor/PM thermal capacitance [J/°C] */
#define AFTO_C4     3000.0f     /* Housing thermal capacitance [J/°C] */
#define AFTO_R12    0.15f       /* Winding→Iron resistance [°C/W] */
#define AFTO_R23    1.80f       /* Iron→Rotor (airgap) resistance [°C/W] */
#define AFTO_R24    0.08f       /* Iron→Housing resistance [°C/W] */
#define AFTO_R34    2.50f       /* Rotor→Housing resistance [°C/W] */
#define AFTO_R14    0.30f       /* Winding→Housing resistance [°C/W] */
#define AFTO_R4A    0.05f       /* Housing→Ambient resistance [°C/W] */
#define AFTO_K_FE   5e-5f       /* Iron loss coefficient */
#define AFTO_K_MAG  1e-5f       /* Magnet eddy current coefficient */

/* EKF parameters */
#define AFTO_EKF_Q          0.5f    /* Process noise covariance */
#define AFTO_EKF_R_FLUX_BASE 5.0f   /* Base flux measurement noise */
#define AFTO_EKF_R_THERMAL  15.0f   /* Thermal measurement noise */
#define AFTO_OMEGA_NOM      4000.0f /* Nominal speed for weighting [RPM] */

/* AI correction limits */
#define AFTO_AI_CLAMP       15.0f   /* Max correction magnitude [°C] */

/* Protection thresholds */
#define AFTO_T_WARNING      120.0f  /* Warning threshold [°C] */
#define AFTO_T_DERATE       140.0f  /* Derating start [°C] */
#define AFTO_T_CRITICAL     160.0f  /* Hard current limit [°C] */
#define AFTO_T_SHUTDOWN     180.0f  /* Emergency shutdown [°C] */


/* ================================================================
 * NEURAL NETWORK WEIGHTS (exported from Python training)
 * Architecture: 6 → 16 → 16 → 1 (MLP, ReLU, Linear)
 * Total: 401 parameters
 * Adopted from: deep-pmsm residual learning approach
 * ================================================================ */

/* Input normalization (StandardScaler, adopted from deep-pmsm) */
static const float nn_input_mean[6] = {
    65.0f, 3500.0f, -40.0f, 80.0f, 62.0f, 70.0f
};
static const float nn_input_std[6] = {
    25.0f, 2000.0f, 30.0f, 60.0f, 22.0f, 28.0f
};
static const float nn_output_mean = 0.0f;
static const float nn_output_std = 3.5f;

/* NOTE: Replace these with actual trained weights from Python export.
 * These are placeholder values for compilation. */
static float W1[6][16];   /* Layer 1 weights: 6×16 = 96 */
static float b1[16];      /* Layer 1 bias: 16 */
static float W2[16][16];  /* Layer 2 weights: 16×16 = 256 */
static float b2[16];      /* Layer 2 bias: 16 */
static float W3[16][1];   /* Layer 3 weights: 16×1 = 16 */
static float b3[1];       /* Layer 3 bias: 1 */


/* ================================================================
 * DATA STRUCTURES
 * ================================================================ */

typedef enum {
    AFTO_STATUS_OK       = 0,
    AFTO_STATUS_WARNING  = 1,
    AFTO_STATUS_DERATING = 2,
    AFTO_STATUS_CRITICAL = 3,
    AFTO_STATUS_SHUTDOWN = 4,
    AFTO_STATUS_NN_FAULT = 5,
} AFTO_Status_t;

typedef struct {
    /* Sensor inputs */
    float i_d;          /* d-axis current [A] */
    float i_q;          /* q-axis current [A] */
    float v_d;          /* d-axis voltage [V] */
    float v_q;          /* q-axis voltage [V] */
    float omega;        /* Electrical speed [rad/s] or [RPM] */
    float T_stator;     /* Measured stator temperature [°C] */
    float T_ambient;    /* Ambient/coolant temperature [°C] */
} AFTO_Input_t;

typedef struct {
    float T_magnet;     /* Final estimated PM temperature [°C] */
    float T_flux;       /* Flux observer estimate [°C] */
    float T_thermal;    /* Thermal model estimate [°C] */
    float T_ekf;        /* EKF fused estimate (before AI) [°C] */
    float delta_ai;     /* AI correction term [°C] */
    float psi_m;        /* Estimated flux linkage [Wb] */
    float w_flux;       /* Flux observer trust weight [0–1] */
    AFTO_Status_t status;
} AFTO_Output_t;

typedef struct {
    /* Flux observer state */
    float psi_m_est;        /* Estimated flux linkage */
    float psi_m_filtered;   /* Low-pass filtered flux */
    
    /* Thermal model state (4-node LPTN) */
    float T_node[4];        /* [T_winding, T_iron, T_magnet, T_housing] */
    
    /* EKF state */
    float x_ekf;            /* State estimate */
    float P_ekf;            /* Error covariance */
    
    /* AI correction state */
    uint8_t ai_enabled;     /* 0 = disabled (fail-safe), 1 = enabled */
    uint32_t warmup_counter; /* Counts samples until AI warmup complete */
    
    /* Diagnostics */
    float max_divergence;   /* Max flux-thermal divergence seen */
    uint32_t fault_count;   /* Number of NN faults detected */
    
    /* Configuration */
    float dt;               /* Sample period [s] */
} AFTO_State_t;


/* ================================================================
 * FUNCTION PROTOTYPES
 * ================================================================ */

void AFTO_Init(AFTO_State_t *state, float dt, float T_initial);
AFTO_Output_t AFTO_Update(AFTO_State_t *state, const AFTO_Input_t *input);


/* ================================================================
 * IMPLEMENTATION
 * ================================================================ */

static inline float clampf(float val, float lo, float hi) {
    return val < lo ? lo : (val > hi ? hi : val);
}

static inline float relu(float x) {
    return x > 0.0f ? x : 0.0f;
}

/**
 * @brief Initialize AFTO estimator state
 */
void AFTO_Init(AFTO_State_t *state, float dt, float T_initial) {
    state->psi_m_est = AFTO_PSI_M_REF;
    state->psi_m_filtered = AFTO_PSI_M_REF;
    
    state->T_node[0] = T_initial;  /* Winding */
    state->T_node[1] = T_initial;  /* Iron */
    state->T_node[2] = T_initial;  /* Magnet */
    state->T_node[3] = T_initial;  /* Housing */
    
    state->x_ekf = T_initial;
    state->P_ekf = 10.0f;
    
    state->ai_enabled = 0;  /* Disabled during warmup */
    state->warmup_counter = 0;
    state->max_divergence = 0.0f;
    state->fault_count = 0;
    state->dt = dt;
}

/**
 * @brief Run flux observer to extract ψ_m and convert to temperature
 */
static float AFTO_FluxObserver(AFTO_State_t *state, const AFTO_Input_t *in) {
    /* Compensate stator resistance for temperature */
    float Rs = AFTO_RS_REF * (1.0f + AFTO_ALPHA_CU * (in->T_stator - AFTO_T_REF));
    
    /* Extract ψ_m from q-axis voltage equation (quasi-steady-state) */
    /* v_q = R_s·i_q + ω_e·(L_d·i_d + ψ_m)  →  ψ_m = (v_q - R_s·i_q)/ω_e - L_d·i_d */
    float omega_e = fabsf(in->omega);
    
    if (omega_e > 50.0f) {  /* Only valid above ~50 RPM electrical */
        state->psi_m_est = (in->v_q - Rs * in->i_q) / omega_e - AFTO_LD * in->i_d;
    }
    /* else: keep previous estimate (flux observer unreliable at low speed) */
    
    /* Low-pass filter (first-order IIR, τ ≈ 5 samples) */
    float alpha_lpf = 0.2f;
    state->psi_m_filtered = alpha_lpf * state->psi_m_est + 
                            (1.0f - alpha_lpf) * state->psi_m_filtered;
    
    /* Convert flux → temperature */
    float T_flux = AFTO_T_REF + 
        (state->psi_m_filtered - AFTO_PSI_M_REF) / 
        (AFTO_ALPHA_PSI * AFTO_PSI_M_REF);
    
    return T_flux;
}

/**
 * @brief Run 4-node LPTN thermal model one time step
 */
static float AFTO_ThermalModel(AFTO_State_t *state, const AFTO_Input_t *in) {
    float *T = state->T_node;
    float dt = state->dt;
    float T_amb = in->T_ambient;
    
    /* Compute losses */
    float Rs = AFTO_RS_REF * (1.0f + AFTO_ALPHA_CU * (T[0] - AFTO_T_REF));
    float P_cu  = 1.5f * Rs * (in->i_d * in->i_d + in->i_q * in->i_q);
    float P_fe  = AFTO_K_FE * in->omega * in->omega;
    float P_mag = AFTO_K_MAG * in->omega * in->omega;
    
    /* Heat flow equations (Forward Euler) */
    float dT0 = (dt / AFTO_C1) * (P_cu - (T[0]-T[1])/AFTO_R12 - (T[0]-T[3])/AFTO_R14);
    float dT1 = (dt / AFTO_C2) * (P_fe - (T[1]-T[0])/AFTO_R12 - (T[1]-T[2])/AFTO_R23 - (T[1]-T[3])/AFTO_R24);
    float dT2 = (dt / AFTO_C3) * (P_mag - (T[2]-T[1])/AFTO_R23 - (T[2]-T[3])/AFTO_R34);
    float dT3 = (dt / AFTO_C4) * (-(T[3]-T[0])/AFTO_R14 - (T[3]-T[1])/AFTO_R24 - (T[3]-T[2])/AFTO_R34 - (T[3]-T_amb)/AFTO_R4A);
    
    T[0] += dT0;
    T[1] += dT1;
    T[2] += dT2;
    T[3] += dT3;
    
    /* Physical bounds */
    for (int i = 0; i < 4; i++) {
        T[i] = clampf(T[i], T_amb - 5.0f, 300.0f);
    }
    
    return T[2];  /* Return magnet node temperature */
}

/**
 * @brief EKF fusion with speed-adaptive covariance scheduling
 */
static float AFTO_EKF(AFTO_State_t *state, float T_flux, float T_thermal, float omega) {
    /* === PREDICT === */
    float x_pred = T_thermal;  /* Use thermal model as process model */
    float P_pred = state->P_ekf + AFTO_EKF_Q;
    
    /* === Speed-adaptive measurement covariance === */
    float speed_norm = clampf(fabsf(omega) / AFTO_OMEGA_NOM, 0.01f, 1.0f);
    float R_flux = AFTO_EKF_R_FLUX_BASE / (speed_norm * speed_norm);
    float R_therm = AFTO_EKF_R_THERMAL;
    
    /* === Sequential Kalman Update === */
    /* Update 1: Flux observer measurement */
    float K1 = P_pred / (P_pred + R_flux);
    float x = x_pred + K1 * (T_flux - x_pred);
    float P = (1.0f - K1) * P_pred;
    
    /* Update 2: Thermal model measurement */
    float K2 = P / (P + R_therm);
    x = x + K2 * (T_thermal - x);
    P = (1.0f - K2) * P;
    
    state->x_ekf = x;
    state->P_ekf = P;
    
    return x;
}

/**
 * @brief Edge-AI MLP inference (401 parameters, < 2 µs)
 * Adopted from: deep-pmsm residual learning concept
 */
static float AFTO_NNCorrection(const AFTO_Input_t *in, float T_ekf, float T_thermal) {
    /* Build input vector */
    float input[6] = {
        T_ekf,
        in->omega,
        in->i_d,
        in->i_q,
        T_thermal,
        in->T_stator
    };
    
    /* Normalize (StandardScaler — adopted from deep-pmsm LightDataManager) */
    float x_norm[6];
    for (int i = 0; i < 6; i++) {
        x_norm[i] = (input[i] - nn_input_mean[i]) / (nn_input_std[i] + 1e-8f);
    }
    
    /* Layer 1: Dense(6 → 16, ReLU) */
    float h1[16];
    for (int j = 0; j < 16; j++) {
        h1[j] = b1[j];
        for (int i = 0; i < 6; i++) {
            h1[j] += x_norm[i] * W1[i][j];
        }
        h1[j] = relu(h1[j]);
    }
    
    /* Layer 2: Dense(16 → 16, ReLU) */
    float h2[16];
    for (int j = 0; j < 16; j++) {
        h2[j] = b2[j];
        for (int i = 0; i < 16; i++) {
            h2[j] += h1[i] * W2[i][j];
        }
        h2[j] = relu(h2[j]);
    }
    
    /* Layer 3: Dense(16 → 1, linear) */
    float delta = b3[0];
    for (int i = 0; i < 16; i++) {
        delta += h2[i] * W3[i][0];
    }
    
    /* De-normalize output */
    delta = delta * nn_output_std + nn_output_mean;
    
    /* Safety clamp */
    delta = clampf(delta, -AFTO_AI_CLAMP, AFTO_AI_CLAMP);
    
    return delta;
}

/**
 * @brief Main AFTO update function — call every control cycle
 * 
 * Integrates all components:
 *   Path A: Flux Observer → T_flux
 *   Path B: Thermal Model → T_thermal
 *   Fusion: EKF → T_ekf
 *   Correction: NN → Δ_AI
 *   Output: T_final = T_ekf + Δ_AI
 */
AFTO_Output_t AFTO_Update(AFTO_State_t *state, const AFTO_Input_t *input) {
    AFTO_Output_t out;
    
    /* --- Path A: Flux Observer --- */
    out.T_flux = AFTO_FluxObserver(state, input);
    out.psi_m = state->psi_m_filtered;
    
    /* --- Path B: Thermal Model --- */
    out.T_thermal = AFTO_ThermalModel(state, input);
    
    /* --- EKF Fusion --- */
    out.T_ekf = AFTO_EKF(state, out.T_flux, out.T_thermal, input->omega);
    
    /* Speed-dependent trust weight (for diagnostics/logging) */
    float speed_norm = clampf(fabsf(input->omega) / AFTO_OMEGA_NOM, 0.01f, 1.0f);
    out.w_flux = speed_norm * speed_norm;
    
    /* --- AI Correction --- */
    /* Warmup: disable AI for first 100 samples (~5 seconds at 50µs×100) */
    if (state->warmup_counter < 100) {
        state->warmup_counter++;
        state->ai_enabled = 0;
    } else {
        state->ai_enabled = 1;
    }
    
    if (state->ai_enabled) {
        out.delta_ai = AFTO_NNCorrection(input, out.T_ekf, out.T_thermal);
        
        /* Fail-safe: check for NaN or unreasonable output */
        if (isnan(out.delta_ai) || isinf(out.delta_ai) || 
            fabsf(out.delta_ai) > AFTO_AI_CLAMP) {
            out.delta_ai = 0.0f;
            state->fault_count++;
            out.status = AFTO_STATUS_NN_FAULT;
        }
    } else {
        out.delta_ai = 0.0f;
    }
    
    /* --- Final output --- */
    out.T_magnet = out.T_ekf + out.delta_ai;
    
    /* --- Cross-validation diagnostic --- */
    float divergence = fabsf(out.T_flux - out.T_thermal);
    if (divergence > state->max_divergence) {
        state->max_divergence = divergence;
    }
    
    /* --- Protection logic --- */
    if (out.T_magnet >= AFTO_T_SHUTDOWN) {
        out.status = AFTO_STATUS_SHUTDOWN;
    } else if (out.T_magnet >= AFTO_T_CRITICAL) {
        out.status = AFTO_STATUS_CRITICAL;
    } else if (out.T_magnet >= AFTO_T_DERATE) {
        out.status = AFTO_STATUS_DERATING;
    } else if (out.T_magnet >= AFTO_T_WARNING) {
        out.status = AFTO_STATUS_WARNING;
    } else {
        out.status = AFTO_STATUS_OK;
    }
    
    return out;
}

/* ================================================================
 * UTILITY: Thermal derating controller
 * Returns maximum allowed current ratio [0.0 – 1.0]
 * ================================================================ */
float AFTO_GetDeratingFactor(float T_magnet) {
    if (T_magnet <= AFTO_T_DERATE) {
        return 1.0f;  /* Full power allowed */
    } else if (T_magnet >= AFTO_T_CRITICAL) {
        return 0.2f;  /* Minimum safe current */
    } else {
        /* Linear derating between DERATE and CRITICAL */
        return 1.0f - 0.8f * (T_magnet - AFTO_T_DERATE) / (AFTO_T_CRITICAL - AFTO_T_DERATE);
    }
}

#endif /* AFTO_ESTIMATOR_H */
