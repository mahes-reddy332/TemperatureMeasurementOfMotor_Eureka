# 🔬 deep-pmsm Repository: Complete Technical Analysis & Hybrid Adaptation Guide

**Repository**: [upb-lea/deep-pmsm](https://github.com/upb-lea/deep-pmsm) by W. Kirchgässner (2018–2021)
**Published in**: IEEE Trans. Power Electronics, "Estimating Electric Motor Temperatures with Deep Residual Machine Learning" (2021)
**Goal**: Adapt this repo's NN component as the **Edge-AI correction layer** in your AFTO hybrid system.

---

# 🔷 PART 1: REPOSITORY UNDERSTANDING

## 1.1 What Problem This Repo Solves

This repository estimates **internal temperatures** of a PMSM (Permanent Magnet Synchronous Motor) using **purely data-driven deep learning** — no physics model involved. Specifically, it maps measurable electrical/thermal inputs to **four hidden temperature targets** that are difficult or expensive to measure in production:

| Target (Output) | What It Is |
|---|---|
| `pm` | **Permanent Magnet temperature** (rotor) — measured via infrared thermography on test bench only |
| `stator_yoke` | Stator yoke temperature |
| `stator_tooth` | Stator tooth temperature |
| `stator_winding` | Stator winding temperature |

> [!IMPORTANT]
> The `pm` (permanent magnet) target is **exactly what your Varroc Eureka project needs**. This repo is one of the few open-source projects with real measured PM temperature data.

## 1.2 Input Features Used

From [config.py](file:///C:/Users/PC-ACER/.gemini/antigravity/brain/e96f167e-f6d4-4389-926b-4be6ed5272f9/.system_generated/steps/48/content.md):

```python
'Input_param_names': ['ambient',      # Ambient temperature (°C)
                      'coolant',      # Coolant outflow temperature (°C)
                      'u_d',          # Voltage d-component (V)
                      'u_q',          # Voltage q-component (V)
                      'motor_speed',  # Motor speed (RPM)
                      'i_d',          # Current d-component (A)
                      'i_q',          # Current q-component (A)
                     ]
```

**Additionally, the data pipeline creates engineered features:**
- `i_s = sqrt(i_d² + i_q²)` — stator current magnitude
- `u_s = sqrt(u_d² + u_q²)` — stator voltage magnitude
- `P_el = i_s × u_s` — electrical power (apparent)
- **Exponentially weighted rolling means** at 4 different lookback windows (840, 6360, 3360, 1320 half-second samples)
- **Exponentially weighted rolling standard deviations** at the same windows
- `time` — time index within each profile

This creates approximately **~90+ input features** from the original 7 raw inputs.

**Sampling rate**: 2 Hz (one sample every 0.5 seconds)

## 1.3 Output Predicted

```python
'Target_param_names': ['pm',              # PM temperature
                       'stator_yoke',      # Stator yoke temp
                       'stator_tooth',     # Stator tooth temp
                       'stator_winding'    # Stator winding temp
                      ]
```

This is a **multi-output regression** problem — all 4 temperatures are predicted simultaneously.

## 1.4 Model Architectures

### CNN Architecture (`hot_cnn.py` + `cnn_model_utils.py`)

| Parameter | Default Value |
|---|---|
| Architecture | **Residual 1D CNN** (`arch='res'`) |
| Layers | 2 convolutional layers |
| Filters | 4 per layer |
| Kernel size | 2 |
| Padding | Causal (important for time-series — prevents future leakage) |
| Dilation | Exponentially increasing (1, 2, 4, ...) — WaveNet-style |
| Activation | ReLU |
| Normalization | BatchNorm |
| Dropout | SpatialDropout1D, rate=0.3 |
| Regularization | L2 (1e-8 on kernel, bias, activity) |
| Pooling | GlobalMaxPooling1D → Dense(4 targets) |
| Optimizer | Adam, lr=1e-4 |
| Loss | MSE |
| Window/lookback | 32 time steps |
| Batch size | 128 |
| Epochs | 250 |

**Key design**: Uses **causal dilated convolutions** (inspired by WaveNet) with **residual skip connections**. Every 2 layers, a 1×1 conv shortcut is added:

```
Input → Conv1D(causal, dilation=1) → BN → ReLU → Dropout
                                                    ↓
      → Conv1D(causal, dilation=2) → BN → ReLU → Dropout
                                                    ↓
      + 1x1 Conv Shortcut ──────────────────────────→ ADD
                                                    ↓
      → GlobalMaxPool1D → Dense(4) → Output
```

### RNN Architecture (`hot_rnn.py` + `rnn_model_utils.py`)

| Parameter | Default Value |
|---|---|
| Architecture | **Residual LSTM** (`arch='res_lstm'`) |
| Layers | 1 LSTM layer (up to 7 in HP search) |
| Units | 4 per layer |
| Stateful | Yes (hidden state carries across batches) |
| Dropout | 0.3 (both regular and recurrent) |
| Gaussian Noise | σ=0.01 |
| Regularization | L2 on kernel (0.1), recurrent (0.01), activity (3e-5), bias (1e-5) |
| Gradient clipping | clipnorm=0.25, clipvalue=0.01 |
| TBPTT length | 128 time steps (Truncated BPTT) |
| Output | TimeDistributed Dense(4 targets) |
| Optimizer | Adam, lr=0.01 |

**Key design**: Uses **residual connections around LSTM layers** — the input is also passed through a Dense layer and added to the LSTM output. This helps gradient flow and allows the LSTM to learn corrections:

```
Input x ────────────────→ Dense(n_units, ReLU) ──→ ADD ──→ [next layers...]
    ↓                                               ↑
    → LSTM(stateful) → GaussianNoise ───────────────┘
```

**Chrono Initialization**: Uses a special bias initialization for the LSTM forget gate based on ["Can Recurrent Neural Networks Warp Time?"](https://openreview.net/forum?id=SJcKhk-Ab) to handle long-range temporal dependencies.

## 1.5 Data Pipeline (Preprocessing)

```
Raw CSV (measures.csv)
    ↓
[1] Load + type conversion (float32)
    ↓
[2] Drop unwanted profiles
    ↓
[3] Feature Engineering:
    ├── Compute i_s, u_s, P_el
    ├── Exponentially Weighted Rolling Mean (4 windows)
    ├── Exponentially Weighted Rolling Std (4 windows)
    └── Add time index
    ↓
[4] StandardScaler fit on TRAIN set only
    ↓
[5] Transform all sets (train/val/test)
    ↓
[6] Split by profile_id:
    ├── Train: all profiles except val/test
    ├── Validation: profile '58'
    └── Test: profiles '65', '72'
    ↓
[7] Batch generation:
    ├── CNN: Sliding window (length=32), shuffled TimeseriesGenerator
    └── RNN: Stateful batches with TBPTT chunking, zero-padding, sample weights
```

> [!NOTE]
> **Key insight**: The `StandardScaler` is fit ONLY on training data, then applied to val/test. This prevents data leakage. The scaler parameters are also used for `inverse_transform` to convert predictions back to real temperature units (°C).

## 1.6 Training Process

1. **Multiple trials**: Default 3 trials per training run (different random seeds)
2. **EarlyStopping**: Monitor `val_loss`, patience=30 epochs, min_delta=1e-3
3. **Learning rate reduction**: ReduceLROnPlateau on `loss`, patience=10 epochs
4. **Score metric**: MSE in K² (Kelvin squared) after inverse-transforming to real temperature
5. **Bayesian HP optimization**: `hp_tune_rnn.py` and `hp_tune_cnn.py` use scikit-optimize for automated hyperparameter search
6. **Best reported results**: ~2.35 K² (CNN res, 2 layers, window=32) and ~3.04 K² (RNN res_lstm)

---

# 🔷 PART 2: LIMITATIONS (Why Not Standalone)

## 2.1 Pure Black-Box — No Physical Interpretability

| Limitation | Impact on Your Project |
|---|---|
| No physics model embedded | Cannot explain *why* temperature changed — just predicts a number |
| No flux linkage estimation | Doesn't estimate ψ_m, so can't detect demagnetization onset |
| No thermal network | Cannot model heat flow paths — can't predict under new cooling conditions |
| No R_s compensation | Doesn't account for stator resistance drift with temperature |

**Judges will ask**: "How does your model know the physics?" — A pure DL model has no answer.

## 2.2 Extreme Data Dependency

| Issue | Detail |
|---|---|
| **Training data**: Kaggle dataset | Only 1 specific motor on 1 test bench |
| **No transfer learning** | Model trained on Motor A will NOT work on Motor B without retraining |
| **Profile diversity** | ~72 measurement profiles — diverse but limited |
| **Sampling rate** | 2 Hz is very slow for motor control (typical FOC runs at 10–20 kHz) |
| **No simulated data support** | Repo expects real test-bench CSV only |

## 2.3 Overfitting Risks

- **~90+ features** from only 7 raw inputs — many are highly correlated (rolling means at similar windows)
- **Small validation set**: Only 1 profile for validation (`profile_id=58`)
- **No cross-validation** in default setup (one fixed train/val/test split)
- **Heavy regularization** needed (L2, dropout, gradient clipping) — suggests the model is prone to overfitting
- **Stateful LSTM** can memorize specific temperature trajectories

## 2.4 Not Embeddable As-Is

- Uses **Keras 2.x / TensorFlow 1.x** (outdated — `from tensorflow import set_random_seed`)
- Model architecture is too large for embedded MCU (90+ features, multiple layers, stateful LSTM)
- No quantization or pruning pipeline
- No export to TFLite, ONNX, or C header

## 2.5 No Real-Time Control Integration

- No feedback loop to motor controller
- No derating logic
- No CAN bus output
- No concept of "estimation uncertainty" — you don't know when to trust the output

---

# 🔷 PART 3: ADAPTATION FOR YOUR HYBRID PROJECT

## 3.1 The Key Insight: Use as Correction, Not Prediction

```
┌─────────────────────────────────────────┐
│            ORIGINAL REPO                │
│                                         │
│  [i_d, i_q, u_d, u_q, ω, T_amb, T_c]  │
│              ↓                          │
│    ┌─────────────┐                      │
│    │  Deep CNN/RNN│ → T_pm (predicted)  │
│    └─────────────┘                      │
│                                         │
│  Problem: Black box, no physics         │
└─────────────────────────────────────────┘

              ↓ TRANSFORM INTO ↓

┌──────────────────────────────────────────────────┐
│            YOUR HYBRID SYSTEM (AFTO)             │
│                                                  │
│  [i_d, i_q, ω, v_d, v_q, T_stator, T_ambient]  │
│       ↓                    ↓                     │
│  ┌──────────┐      ┌──────────────┐             │
│  │Flux Obs. │      │Thermal LPTN  │             │
│  │→ T_mag,A │      │→ T_mag,B     │             │
│  └──────────┘      └──────────────┘             │
│       ↓                    ↓                     │
│       └────────┬───────────┘                     │
│                ↓                                 │
│     ┌────────────────┐                           │
│     │ EKF Fusion      │ → T_EKF                  │
│     └────────────────┘                           │
│                ↓                                 │
│     ┌────────────────────────────────┐           │
│     │ Lightweight NN (from this repo)│           │
│     │ Input: [T_EKF, ω, i_d, i_q,   │           │
│     │         T_thermal, T_stator]   │           │
│     │ Output: Δ_correction           │           │
│     └────────────────────────────────┘           │
│                ↓                                 │
│     T_final = T_EKF + Δ_correction              │
└──────────────────────────────────────────────────┘
```

## 3.2 Step-by-Step: Replace Dataset with Simulated Data

### Step 1: Generate Simulation Data (MATLAB or Python)

You need a dataset with these columns:

```python
# Required columns for YOUR hybrid training dataset
columns = [
    # Operating conditions (inputs to your system)
    'i_d',          # d-axis current (A)
    'i_q',          # q-axis current (A)
    'omega',        # electrical speed (rad/s)
    'v_d',          # d-axis voltage (V)
    'v_q',          # q-axis voltage (V)
    'T_stator',     # measured stator temperature (°C)
    'T_ambient',    # ambient temperature (°C)
    
    # Physics model outputs (intermediate)
    'T_EKF',        # EKF-fused temperature estimate (°C)
    'T_thermal',    # LPTN thermal model estimate (°C)
    'T_flux',       # Flux observer estimate (°C)
    
    # Ground truth (from simulation)
    'T_true',       # Actual PM temperature from simulation (°C)
    
    # Metadata
    'profile_id',   # Scenario identifier
    'time',         # Time step index
]
```

### Step 2: Generate Using Simulink or Python

```python
# Python pseudocode for synthetic data generation
import numpy as np
import pandas as pd

def generate_drive_cycle(profile_id, duration_s=1800, dt=0.01):
    """Generate one drive cycle with physics simulation"""
    N = int(duration_s / dt)
    t = np.arange(N) * dt
    
    # 1. Generate operating point trajectory
    omega = generate_speed_profile(t)   # e.g., WLTP-like
    i_q = generate_torque_current(t)    # torque demand
    i_d = compute_id_from_mtpa(i_q)     # MTPA strategy
    v_d, v_q = compute_voltages(i_d, i_q, omega)  # from PMSM model
    
    # 2. Run TRUE thermal simulation (this is your ground truth)
    T_true = simulate_thermal_model_true(i_d, i_q, omega, T_ambient=25)
    T_stator = T_true['stator_winding']  # accessible measurement
    T_ambient = 25 + 2*np.random.randn(N)  # slight variation
    
    # 3. Run your EKF estimation pipeline (with intentional model error)
    T_EKF = run_ekf_estimation(i_d, i_q, omega, v_d, v_q, 
                                T_stator, T_ambient,
                                model_error_percent=5)  # 5% parameter error
    T_thermal = run_lptn_only(i_d, i_q, omega, T_ambient)
    T_flux = run_flux_observer_only(v_d, v_q, i_d, i_q, omega, T_stator)
    
    # 4. Assemble DataFrame
    df = pd.DataFrame({
        'i_d': i_d, 'i_q': i_q, 'omega': omega,
        'v_d': v_d, 'v_q': v_q,
        'T_stator': T_stator, 'T_ambient': T_ambient,
        'T_EKF': T_EKF, 'T_thermal': T_thermal, 'T_flux': T_flux,
        'T_true': T_true['pm'],
        'profile_id': profile_id,
        'time': np.arange(N),
    })
    return df

# Generate multiple scenarios
scenarios = []
for pid in range(50):
    scenarios.append(generate_drive_cycle(pid))
dataset = pd.concat(scenarios, ignore_index=True)
dataset.to_csv('hybrid_training_data.csv', index=False)
```

### Step 3: Redefine Input/Output for NN

**Original repo**: Maps raw electrical signals → absolute temperatures (4 targets)

**Your adaptation**: Maps EKF estimate + context → **error correction** (1 target)

```python
# YOUR new config
Input_param_names = [
    'T_EKF',        # The EKF fused estimate (main input)
    'omega',        # Speed (affects flux observer reliability)
    'i_d',          # Current d (affects losses, saturation)
    'i_q',          # Current q (affects losses, saturation)
    'T_thermal',    # Thermal model estimate (alternative view)
    'T_stator',     # Measured stator temp (observable)
]

Target_param_names = [
    'error',        # = T_true - T_EKF  (what NN must learn)
]
```

**Why predict the ERROR, not the absolute temperature?**

| Approach | What NN learns | Data needed | Fail-safe |
|---|---|---|---|
| Predict T directly | Full temp. mapping | Huge dataset | None — if NN fails, no estimate |
| **Predict error Δ** | Small correction | Small dataset | **Yes** — if NN fails, EKF still works |

The error signal `Δ = T_true - T_EKF` is typically:
- Small (±3–10 °C)
- Structured (systematic model error, not random noise)
- Easier to learn with a tiny network

---

# 🔷 PART 4: MODEL SIMPLIFICATION

## 4.1 Why Simplify

| Original Repo | Your Need |
|---|---|
| ~90 input features | 6 input features |
| 4 output targets | 1 output (error correction Δ) |
| CNN with causal dilation or Stateful LSTM | Simple MLP sufficient |
| Batch size 128, window 32 | Single-sample inference |
| Runs on GPU workstation | Must run on STM32 MCU (<5 µs) |
| Keras 2 / TF 1 | Needs to export to C / fixed-point |

## 4.2 Recommended Simplified Model: Lightweight MLP

Replace the entire CNN/RNN with a **3-layer MLP**:

```python
import tensorflow as tf
from tensorflow import keras

def build_correction_mlp():
    """Edge-AI correction network for embedded deployment"""
    model = keras.Sequential([
        # Input: [T_EKF, omega, i_d, i_q, T_thermal, T_stator]
        keras.layers.Input(shape=(6,)),
        
        # Hidden layer 1
        keras.layers.Dense(16, activation='relu',
                          kernel_regularizer=keras.regularizers.l2(1e-4)),
        
        # Hidden layer 2
        keras.layers.Dense(16, activation='relu',
                          kernel_regularizer=keras.regularizers.l2(1e-4)),
        
        # Output: correction term Δ
        keras.layers.Dense(1, activation='linear'),  # linear = no bounds
    ])
    
    model.compile(optimizer=keras.optimizers.Adam(learning_rate=1e-3),
                  loss='mse',
                  metrics=['mae'])
    return model
```

**Parameter count:**
```
Layer 1: 6×16 + 16 = 112 parameters
Layer 2: 16×16 + 16 = 272 parameters
Layer 3: 16×1 + 1 = 17 parameters
─────────────────────────────
Total: 401 parameters (< 2 KB in float32, < 1 KB in int8)
```

## 4.3 Why MLP is Sufficient (Not CNN/RNN)

| Consideration | Analysis |
|---|---|
| **Temporal dependency?** | The EKF already handles temporal dynamics — its output T_EKF already encodes history. The NN only corrects the *residual error*, which is quasi-static relative to operating point. |
| **Causal filtering?** | Not needed — the NN sees the current state, not a raw time series. |
| **Statefulness?** | Not needed — the EKF maintains all state. The NN is memoryless. |
| **Window lookback?** | Not needed — rolling features are already in T_EKF via the Kalman filter's propagation. |

> [!TIP]
> If you *do* want temporal error correction (e.g., transient compensation), add 2–3 lagged features: `[Δ(k-1), Δ(k-5), Δ(k-10)]` — still an MLP, just with 9 inputs instead of 6.

## 4.4 Export to C for MCU

```python
# After training, export weights as C header
import numpy as np

def export_to_c_header(model, filename='nn_weights.h'):
    """Export trained Keras model weights as C arrays for MCU"""
    with open(filename, 'w') as f:
        f.write('#ifndef NN_WEIGHTS_H\n#define NN_WEIGHTS_H\n\n')
        for i, layer in enumerate(model.layers):
            weights = layer.get_weights()
            if len(weights) == 0:
                continue
            W, b = weights[0], weights[1]
            f.write(f'// Layer {i}: {layer.name}\n')
            f.write(f'const float W{i}[{W.shape[0]}][{W.shape[1]}] = {{\n')
            for row in W:
                f.write('  {' + ', '.join(f'{v:.6f}f' for v in row) + '},\n')
            f.write('};\n')
            f.write(f'const float b{i}[{b.shape[0]}] = {{')
            f.write(', '.join(f'{v:.6f}f' for v in b))
            f.write('};\n\n')
        f.write('#endif\n')

export_to_c_header(model, 'nn_weights.h')
```

**MCU inference function (C code for STM32):**

```c
#include "nn_weights.h"

// ReLU activation
static inline float relu(float x) { return x > 0.0f ? x : 0.0f; }

float nn_correction(float T_EKF, float omega, float i_d, float i_q, 
                    float T_thermal, float T_stator) {
    // Input vector
    float input[6] = {T_EKF, omega, i_d, i_q, T_thermal, T_stator};
    
    // Normalize inputs (using training set mean/std)
    for (int i = 0; i < 6; i++) {
        input[i] = (input[i] - input_mean[i]) / input_std[i];
    }
    
    // Layer 1: Dense(6 → 16, ReLU)
    float h1[16];
    for (int j = 0; j < 16; j++) {
        h1[j] = b1[j];
        for (int i = 0; i < 6; i++) {
            h1[j] += input[i] * W1[i][j];
        }
        h1[j] = relu(h1[j]);
    }
    
    // Layer 2: Dense(16 → 16, ReLU)
    float h2[16];
    for (int j = 0; j < 16; j++) {
        h2[j] = b2[j];
        for (int i = 0; i < 16; i++) {
            h2[j] += h1[i] * W2[i][j];
        }
        h2[j] = relu(h2[j]);
    }
    
    // Layer 3: Dense(16 → 1, linear)
    float delta = b3[0];
    for (int i = 0; i < 16; i++) {
        delta += h2[i] * W3[i][0];
    }
    
    // De-normalize output
    delta = delta * output_std + output_mean;
    
    // Clamp correction to ±15°C (safety)
    if (delta > 15.0f) delta = 15.0f;
    if (delta < -15.0f) delta = -15.0f;
    
    return delta;
}
```

**Execution time estimate**: ~400 multiply-accumulate operations → **< 2 µs on STM32G4 @ 170 MHz**

---

# 🔷 PART 5: INTEGRATION — How NN Fits After EKF

## 5.1 Real-Time Inference Flow

```
Every control cycle (~50 µs at 20 kHz):
═══════════════════════════════════════

[1] Read sensors: i_abc, V_dc, θ, T_stator, T_ambient
         ↓
[2] Clarke-Park transform → i_d, i_q, v_d, v_q, ω
         ↓
[3] ┌─────────────────────────────────────────┐
    │         RUN PHYSICS MODELS              │
    │                                         │
    │  Flux Observer → ψ_m → T_flux          │
    │  LPTN Thermal → T_thermal              │
    │                                         │
    │  EKF Fusion(T_flux, T_thermal) → T_EKF │
    └─────────────────────────────────────────┘
         ↓
[4] ┌─────────────────────────────────────────┐
    │         RUN NN CORRECTION               │
    │                                         │
    │  Input: [T_EKF, ω, i_d, i_q,          │
    │          T_thermal, T_stator]           │
    │                                         │
    │  Δ = nn_correction(...)                 │  ← < 2 µs
    │                                         │
    │  T_final = T_EKF + Δ                   │
    └─────────────────────────────────────────┘
         ↓
[5] Output T_final → Derating controller + CAN bus
```

## 5.2 How NN Correction Improves Accuracy

The EKF has systematic errors due to:

| Error Source | Pattern | NN Can Learn? |
|---|---|---|
| Imperfect thermal resistance values (R_ij) | Speed-dependent bias | ✅ Yes — via ω input |
| Magnetic saturation (L changes with i) | Current-dependent bias | ✅ Yes — via i_d, i_q inputs |
| Unmodeled iron losses | Speed²-proportional error | ✅ Yes — via ω input |
| Airgap thermal resistance uncertainty | Constant offset | ✅ Yes — bias term |
| Cross-coupling between windings and magnets | Multi-variate interaction | ✅ Yes — via [T_thermal, T_stator] |

**The NN learns**: *"When the motor is at high speed with high i_q, the EKF consistently underestimates by 4°C because it doesn't model eddy current losses in the magnets accurately enough."*

## 5.3 Fail-Safe Design

```
if (fabs(delta) > 15.0f) {
    // NN output is suspiciously large → likely malfunction
    delta = 0.0f;  // Fall back to pure EKF
    set_diagnostic_flag(NN_CORRECTION_FAULT);
}

if (isnan(delta) || isinf(delta)) {
    delta = 0.0f;  // Fall back to pure EKF
    set_diagnostic_flag(NN_NAN_FAULT);
}
```

> [!IMPORTANT]
> **Key advantage**: If the NN fails or produces garbage, `T_final = T_EKF + 0 = T_EKF`. The system gracefully degrades to the physics-only estimate. This is **NOT possible** with the original repo's pure-DL approach.

---

# 🔷 PART 6: TRAINING STRATEGY

## 6.1 How Much Data Is Needed

| Approach | Data Required | Justification |
|---|---|---|
| **Original repo** (full temp prediction) | ~1M+ samples across 72 profiles | Must learn the entire temperature dynamics from scratch |
| **Your hybrid** (error correction only) | **~50K–200K samples** across 20–50 scenarios | Only learns a small correction Δ; physics does the heavy lifting |

**Rule of thumb**: You need ~100–500× the number of parameters for robust training. With 401 parameters, you need ~40K–200K samples.

## 6.2 How to Generate Synthetic Dataset

### Option A: MATLAB/Simulink (Best for Competition)

1. Use Simulink's **PMSM block** (Simscape Electrical) to generate realistic electrical signals
2. Use a **detailed FEA-calibrated thermal model** (or published thermal parameters) as "ground truth"
3. Run your **simplified LPTN + flux observer + EKF** (with intentionally imperfect parameters) as the "estimator"
4. The error `Δ = T_true - T_EKF` is your training target

### Option B: Python-Only (Fallback)

```python
def simulate_one_scenario(profile_id, duration=1800):
    dt = 0.5  # Match Kaggle dataset rate (2 Hz)
    N = int(duration / dt)
    
    # Motor parameters (50kW EV motor)
    Rs_ref = 0.015  # Ohm at 20°C
    Ld = 0.3e-3     # H
    Lq = 0.7e-3     # H
    psi_m_ref = 0.07 # Wb at 20°C
    alpha_psi = -0.0011  # /°C (NdFeB)
    p = 4            # pole pairs
    
    # Thermal parameters (TRUE model — ground truth)
    C = np.diag([800, 2500, 600, 3000])  # J/°C
    G = np.array([
        [1/0.15+1/0.30, -1/0.15, 0, -1/0.30],
        [-1/0.15, 1/0.15+1/1.80+1/0.08, -1/1.80, -1/0.08],
        [0, -1/1.80, 1/1.80+1/2.50, -1/2.50],
        [-1/0.30, -1/0.08, -1/2.50, 1/0.30+1/0.08+1/2.50+1/0.05]
    ])
    
    # Simplified model (your EKF uses this — 10% parameter error)
    G_model = G * (1 + 0.10 * np.random.randn(*G.shape))
    
    # Generate operating trajectory
    omega = np.random.uniform(100, 8000, N)  # random speed profile
    i_q = np.random.uniform(-200, 200, N)
    i_d = -np.abs(i_q) * 0.3  # simplified MTPA
    
    T_amb = 25.0
    T = np.array([T_amb, T_amb, T_amb, T_amb], dtype=float)
    T_model = T.copy()
    
    records = []
    for k in range(N):
        # TRUE losses
        Rs_true = Rs_ref * (1 + 0.00393*(T[0]-20))
        Pcu = 1.5 * Rs_true * (i_d[k]**2 + i_q[k]**2)
        Pfe = 0.5e-4 * omega[k]**2  # simplified
        Pmag = 1e-5 * omega[k]**2
        P = np.array([Pcu, Pfe, Pmag, 0.0])
        
        # TRUE temperature update
        dT = dt * np.linalg.solve(C, P - G @ (T - T_amb))
        T = T + dT
        
        # MODEL temperature (with errors)
        Rs_model = Rs_ref * 1.05 * (1 + 0.00393*(T_model[0]-20))  # 5% error
        Pcu_m = 1.5 * Rs_model * (i_d[k]**2 + i_q[k]**2)
        P_model = np.array([Pcu_m, Pfe*0.8, Pmag*0.7, 0.0])  # imperfect losses
        dT_model = dt * np.linalg.solve(C, P_model - G_model @ (T_model - T_amb))
        T_model = T_model + dT_model
        
        # Flux observer estimate
        psi_m_true = psi_m_ref * (1 + alpha_psi * (T[2] - 20))
        psi_m_measured = psi_m_true + 0.001*np.random.randn()  # noise
        T_flux = 20 + (psi_m_measured - psi_m_ref) / (alpha_psi * psi_m_ref)
        
        # Simple EKF fusion (weighted average for simplicity)
        w_flux = min(omega[k] / 4000, 1.0)**2
        T_EKF = w_flux * T_flux + (1 - w_flux) * T_model[2]
        
        records.append({
            'i_d': i_d[k], 'i_q': i_q[k], 'omega': omega[k],
            'T_stator': T[0], 'T_ambient': T_amb,
            'T_EKF': T_EKF, 'T_thermal': T_model[2], 'T_flux': T_flux,
            'T_true': T[2],
            'error': T[2] - T_EKF,
            'profile_id': profile_id,
        })
    
    return pd.DataFrame(records)
```

## 6.3 Train-Validation Split

Borrow the repo's approach — split by `profile_id`, not by random sampling:

```python
# Use the SAME split strategy as the original repo
train_profiles = list(range(0, 40))   # 40 scenarios
val_profiles   = list(range(40, 45))  # 5 scenarios
test_profiles  = list(range(45, 50))  # 5 scenarios

train_df = dataset[dataset['profile_id'].isin(train_profiles)]
val_df   = dataset[dataset['profile_id'].isin(val_profiles)]
test_df  = dataset[dataset['profile_id'].isin(test_profiles)]
```

> [!WARNING]
> **Never split randomly within a time series!** Each profile is an independent driving scenario. Random splits would leak future information into training.

## 6.4 Avoid Overfitting

Techniques borrowed from the repo + your adaptations:

| Technique | From Repo | Your Adaptation |
|---|---|---|
| EarlyStopping | ✅ patience=30 | Keep; maybe reduce to patience=15 |
| L2 Regularization | ✅ on all layers | Keep; rate=1e-4 is good |
| Dropout | ✅ 0.3 | Use 0.2 (smaller model needs less) |
| ReduceLROnPlateau | ✅ patience=10 | Keep |
| Data augmentation | ✅ Noise injection on inputs | Add ±2% noise to T_EKF during training |
| Physical constraints | ❌ None | **Add: clamp output Δ to ±15°C** |
| Multiple trials | ✅ n_trials=3 | Keep — report mean ± std |

**Additional anti-overfitting for your hybrid:**
- **Vary model parameters** in training data generation (different R, C values each scenario) → forces NN to learn *general* correction patterns, not motor-specific ones
- **Add sensor noise** to inputs during training (Gaussian, σ=0.5°C for temperatures, 1% for currents)

---

# 🔷 PART 7: FINAL OUTPUT

## 7.1 Clean Architecture Diagram (Text Form — For PPT)

```
╔══════════════════════════════════════════════════════════════════════╗
║                AFTO HYBRID SYSTEM — COMPLETE PIPELINE               ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║   ┌─────────────────────────────────────────────────────────────┐    ║
║   │                    SENSOR LAYER                              │    ║
║   │  i_abc (current sensors)  │  V_dc (bus voltage)             │    ║
║   │  θ (encoder/resolver)     │  T_stator (NTC thermistor)      │    ║
║   │  T_ambient (NTC)          │                                  │    ║
║   └──────────────┬──────────────────────────────────────────────┘    ║
║                  ↓                                                    ║
║   ┌─────────────────────────────────────────────────────────────┐    ║
║   │              SIGNAL PROCESSING LAYER                         │    ║
║   │  Clarke-Park Transform → i_d, i_q, v_d, v_q               │    ║
║   │  Dead-time Compensation → R_s(T) correction                │    ║
║   └──────────────┬──────────────────────────────────────────────┘    ║
║                  ↓                                                    ║
║   ┌──────────────┴──────────────────────────────────┐               ║
║   │            PHYSICS ENGINE                        │               ║
║   │                                                  │               ║
║   │  ┌─────────────┐      ┌─────────────────┐      │               ║
║   │  │PATH A:       │      │PATH B:           │      │               ║
║   │  │Flux Observer │      │4-Node LPTN       │      │               ║
║   │  │ψ_m → T_flux │      │→ T_thermal       │      │               ║
║   │  │(works best   │      │(works best at    │      │               ║
║   │  │ at high ω)   │      │ low ω)           │      │               ║
║   │  └──────┬──────┘      └────────┬────────┘      │               ║
║   │         └──────────┬───────────┘                │               ║
║   │                    ↓                            │               ║
║   │         ┌─────────────────┐                     │               ║
║   │         │  EKF FUSION      │                     │               ║
║   │         │  Speed-adaptive  │                     │               ║
║   │         │  covariance      │                     │               ║
║   │         └────────┬────────┘                     │               ║
║   │                  ↓                              │               ║
║   │              T_EKF                              │               ║
║   └──────────────┬──────────────────────────────────┘               ║
║                  ↓                                                    ║
║   ┌─────────────────────────────────────────────────────────────┐    ║
║   │              EDGE-AI CORRECTION LAYER                        │    ║
║   │                                                              │    ║
║   │  Input: [T_EKF, ω, i_d, i_q, T_thermal, T_stator]         │    ║
║   │               ↓                                              │    ║
║   │  ┌──────────────────────────┐                               │    ║
║   │  │ MLP: 6 → 16 → 16 → 1   │  ← 401 params, <2µs          │    ║
║   │  │ (ReLU, ReLU, Linear)    │  ← Trained on simulated data  │    ║
║   │  │ (Adapted from deep-pmsm │  ← Export as C header          │    ║
║   │  │  repo architecture)     │                                │    ║
║   │  └──────────┬───────────────┘                               │    ║
║   │             ↓                                                │    ║
║   │  Δ_correction (typically ±3°C)                              │    ║
║   │                                                              │    ║
║   │  T_final = T_EKF + Δ_correction                            │    ║
║   │                                                              │    ║
║   │  Safety: |Δ| > 15°C → disable NN → T_final = T_EKF        │    ║
║   └──────────────┬──────────────────────────────────────────────┘    ║
║                  ↓                                                    ║
║   ┌─────────────────────────────────────────────────────────────┐    ║
║   │              OUTPUT LAYER                                    │    ║
║   │  T_final → Thermal Derating Controller                      │    ║
║   │  T_final → CAN Bus (vehicle ECU)                            │    ║
║   │  T_final → Data Logger (IoT / predictive maintenance)       │    ║
║   └─────────────────────────────────────────────────────────────┘    ║
╚══════════════════════════════════════════════════════════════════════╝
```

## 7.2 Final Pipeline — What to Implement

### Phase 1: Simulation (Week 1–2)
1. Build PMSM + thermal model in MATLAB/Simulink or Python
2. Implement flux observer, LPTN, EKF in simulation
3. Generate 50 drive-cycle scenarios (synthetic data)
4. Train MLP on error correction (`T_true - T_EKF`)
5. Validate: show graphs of T_true vs T_EKF vs T_final

### Phase 2: Embedded (Week 3)
6. Export MLP weights to C header
7. Port observer + LPTN + EKF + NN to STM32
8. Run on real small PMSM motor
9. Compare with thermocouple ground truth

### Phase 3: Presentation (Week 4)
10. Generate all 6 comparison graphs
11. Record demo video of real-time estimation
12. Build 20-slide PPT

## 7.3 Key Talking Points for Presentation

### When Judges Ask About the Neural Network:

> **Q**: "Isn't this just a black-box AI?"
> **A**: "No. Our AI is a *physics-informed correction layer*. The physics model (flux observer + thermal network + EKF) does 95% of the work. The NN only learns the 5% residual error. If the NN fails, we gracefully fall back to the physics-only estimate."

> **Q**: "How did you train it without real data?"
> **A**: "We generated synthetic training data by running a high-fidelity simulation model and then estimating with an intentionally simplified model. The NN learns the systematic mismatch between simplified and detailed models."

> **Q**: "Can it run on a real embedded system?"
> **A**: "Yes. The NN has only 401 parameters and takes <2 µs to execute — well within a 50 µs control cycle on an automotive-grade MCU."

> **Q**: "What about the deep-pmsm paper by Kirchgässner?"
> **A**: "We studied their approach extensively. Their work proves that neural networks can estimate PMSM temperatures with <3°C error. However, their approach is purely data-driven and requires test-bench calibration data. We adapted their insight — that NNs excel at capturing residual modeling errors — and combined it with a physics-based backbone for a solution that is both accurate AND deployable."

> **Q**: "How is this different from what Tesla does?"
> **A**: "Tesla uses flux observers with conservative derating margins. Our system adds two innovations: (1) dual-path fusion that eliminates the low-speed blind spot, and (2) an AI correction layer that continuously reduces the estimation error below what pure physics models can achieve."

---

## 7.4 What EXACTLY to Borrow from the Repo

| Component | Borrow? | How |
|---|---|---|
| Data pipeline (`LightDataManager`) | ⚠️ Partial | Borrow the `StandardScaler` + `inverse_transform` pattern |
| Rolling feature engineering | ❌ No | Not needed — your inputs are already processed by EKF |
| CNN model (`build_cnn_model`) | ❌ No | Replace with simple MLP |
| RNN model (`build_rnn_model`) | ❌ No | Replace with simple MLP |
| Residual skip connections | ✅ Yes (concept) | Your physics model IS the skip connection — NN learns the residual |
| Training loop (`TrialReports`) | ⚠️ Partial | Use similar multi-trial approach for robustness |
| EarlyStopping + LR scheduling | ✅ Yes | Copy the callback configuration |
| Profile-based train/val/test split | ✅ Yes | Critical — never split within a time series |
| `inverse_transform` for scoring | ✅ Yes | Report accuracy in °C, not in normalized units |
| Kaggle dataset | ⚠️ Optional | Can use to pre-validate your MLP concept before switching to simulated data |

---

> [!CAUTION]
> **Do NOT present the deep-pmsm repo as your own work.** Instead, cite it as inspiration:
> *"Our approach is inspired by Kirchgässner et al. (IEEE TPEL, 2021), who demonstrated the efficacy of deep residual learning for motor temperature estimation. We extend this concept by using a physics-based backbone with a lightweight neural correction layer, enabling embedded deployment without test-bench calibration data."*

---

*This analysis is part of the Varroc Eureka Challenge preparation.*
*Problem Statement 4: Online PM Temperature Estimation in PMSM*
