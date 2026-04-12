# ⚠️ Major Risks & Mitigation — AFTO System

### Real-Time PMSM Magnet Temperature Estimation (Physics + Observer + AI)

---
---

# 🟦 SLIDE 1 — Risk Overview

> **7 identified risks. Each one mitigated. Zero blind spots.**

---

## Quick-Scan Risk Matrix

| # | ⚠️ Risk | 💥 Impact (if unmitigated) | 🛠️ Mitigation |
|:-:|:---|:---|:---|
| R1 | **Thermal Model Mismatch** | Biased estimate → demagnetization risk | Online RLS parameter adaptation + FEA cross-validation |
| R2 | **Sensor Noise / EMI** | Oscillatory output → false fault triggers | Cascaded filtering (HW anti-alias → Butterworth → Kalman) |
| R3 | **AI Overfitting** | Wrong correction under novel conditions | Confidence gating + diverse training (WLTP, US06, stall) |
| R4 | **Real-Time Latency** | Stale estimate → delayed thermal protection | INT8 quantization + dual-rate loop (1 ms / 10 ms) |
| R5 | **Observer Drift** | 15–25 °C drift over long drives | Anti-windup + dual-observer divergence reset |
| R6 | **Integration Conflicts** | Silent data corruption between modules | AUTOSAR-style interfaces + HIL test harness |
| R7 | **Unit-to-Unit Variation** | 10–20 °C spread across production units | Sobol sensitivity analysis + EOL parameterization |

---

## Risk Severity at a Glance

```mermaid
quadrantChart
    title Risk Severity Map
    x-axis Low Likelihood --> High Likelihood
    y-axis Low Impact --> High Impact
    quadrant-1 Monitor Closely
    quadrant-2 Critical — Act Now
    quadrant-3 Low Priority
    quadrant-4 Mitigate Proactively
    R1 Thermal Model: [0.35, 0.90]
    R4 RT Latency: [0.70, 0.85]
    R3 AI Overfit: [0.55, 0.75]
    R5 Observer Drift: [0.65, 0.70]
    R2 Sensor Noise: [0.75, 0.50]
    R6 Integration: [0.40, 0.45]
    R7 Unit Variation: [0.60, 0.40]
```

---

> 🔑 **Takeaway:** Every risk has a concrete, implementable mitigation — no hand-waving.

---
---

# 🟥 SLIDE 2 — Failure Scenarios & Risk Propagation

> **What actually goes wrong — and how we stop it.**

---

## 📊 Infographic: Risk Propagation Chains

![Risk Propagation Flow — 3 cause-effect chains showing how sensor noise, AI overconfidence, and observer drift cascade into system failures](c:/Users/PC-ACER/Documents/Eureka/slides/risk_propagation_flow.png)

---

## ⛓️ Cause–Effect Chains (Detail)

### Chain 1: Sensor Failure Cascade

```mermaid
flowchart LR
    A["📡 Sensor Noise\n(EMI spike)"] --> B["❌ Corrupted\nCurrent Signal"]
    B --> C["❌ Wrong Copper\nLoss Estimate"]
    C --> D["❌ Wrong Magnet\nTemperature"]
    D --> E["🔥 Derating Too Late\n→ MOTOR DAMAGE"]

    style A fill:#fbbf24,stroke:#b45309,color:#000
    style B fill:#fb923c,stroke:#c2410c,color:#000
    style C fill:#f87171,stroke:#b91c1c,color:#000
    style D fill:#ef4444,stroke:#991b1b,color:#fff
    style E fill:#7f1d1d,stroke:#450a0a,color:#fff
```

### Chain 2: AI Overconfidence Cascade

```mermaid
flowchart LR
    A["🤖 Novel Operating\nCondition"] --> B["❌ AI Extrapolates\nBeyond Training Data"]
    B --> C["❌ Wrong Residual\nCorrection Applied"]
    C --> D["❌ Estimate Deviates\nfrom Physics Baseline"]
    D --> E["🔥 Thermal Protection\nBypassed"]

    style A fill:#a78bfa,stroke:#6d28d9,color:#000
    style B fill:#c084fc,stroke:#7c3aed,color:#000
    style C fill:#f87171,stroke:#b91c1c,color:#000
    style D fill:#ef4444,stroke:#991b1b,color:#fff
    style E fill:#7f1d1d,stroke:#450a0a,color:#fff
```

### Chain 3: Observer Drift Cascade

```mermaid
flowchart LR
    A["🔄 Long Drive\nCycle (>60 min)"] --> B["❌ Integrator\nWind-Up"]
    B --> C["❌ Observer State\nBias Accumulates"]
    C --> D["❌ Slow Drift\n+15–25 °C Error"]
    D --> E["🔥 Over-Temperature\nUndetected"]

    style A fill:#60a5fa,stroke:#1d4ed8,color:#000
    style B fill:#93c5fd,stroke:#2563eb,color:#000
    style C fill:#f87171,stroke:#b91c1c,color:#000
    style D fill:#ef4444,stroke:#991b1b,color:#fff
    style E fill:#7f1d1d,stroke:#450a0a,color:#fff
```

---

## 📊 Infographic: Failure vs. Mitigation Comparison

![Side-by-side comparison — chaotic unmitigated signals vs. clean filtered output with mitigation active](c:/Users/PC-ACER/Documents/Eureka/slides/failure_vs_mitigation.png)

---

## 🧪 Scenario Analysis — Without vs. With Mitigation

| Scenario | ❌ Without Mitigation | ✅ With Mitigation |
|:---|:---|:---|
| **High current spike** (stall / hill-start) | Copper loss estimate saturates → magnet temp lags by 30 °C → derating arrives 8 s too late | Adaptive Kalman tracks transient within 200 ms → derating triggered in < 1 s |
| **EMI noise injection** (inverter switching) | ±5 A noise on current sensor → ±12 °C oscillation on temperature output | HW anti-alias + 2nd-order Butterworth suppresses noise to < ±1 °C ripple |
| **Observer drift** (60-min highway cruise) | Integrator accumulates +20 °C bias undetected | Dual-observer divergence check triggers state reset at Δ > 8 °C; bias cleared in < 500 ms |
| **AI sees novel condition** (cold-soak → WOT) | NN correction pushes estimate 18 °C wrong direction | Mahalanobis distance check detects OOD input → AI correction suppressed → physics-only fallback |

---

> 🔑 **Takeaway:** We don't just list risks — we trace how they propagate and exactly where they're intercepted.

---
---

# 🟩 SLIDE 3 — System Robustness & Defense Strategy

> **Defense in depth. Every layer has a job.**

---

## 📊 Infographic: System Defense Pipeline

![Defense pipeline — Sensors → Filtering → Observer → AI → Safety → Output with degradation modes](c:/Users/PC-ACER/Documents/Eureka/slides/defense_pipeline.png)

---

## 🏗️ Defense Architecture — Signal Flow (Detail)

```mermaid
flowchart LR
    subgraph INPUT ["📥 Inputs"]
        S1["🌡️ Stator Temp\nSensor"]
        S2["⚡ Phase Current\nSensors"]
        S3["🔄 Speed /\nPosition"]
    end

    subgraph LAYER1 ["🔵 Layer 1: Signal Conditioning"]
        F1["Anti-Alias\nHW Filter"]
        F2["Digital\nButterworth"]
        F3["Plausibility\nCheck"]
    end

    subgraph LAYER2 ["🟢 Layer 2: State Estimation"]
        OBS["Adaptive\nFlux-Thermal\nObserver"]
    end

    subgraph LAYER3 ["🟣 Layer 3: AI Correction"]
        AI["Neural Net\nResidual Corrector"]
        CONF["Confidence\nGate"]
    end

    subgraph LAYER4 ["🔴 Layer 4: Safety Layer"]
        FDI["Fault Detection\n& Isolation"]
        SAT["Saturation\nLimits"]
    end

    subgraph OUTPUT ["📤 Output"]
        OUT["✅ Validated\nMagnet Temp\nEstimate"]
    end

    S1 --> F1
    S2 --> F1
    S3 --> F1
    F1 --> F2 --> F3
    F3 --> OBS
    OBS --> AI
    AI --> CONF
    CONF --> FDI
    FDI --> SAT
    SAT --> OUT

    style INPUT fill:#1e293b,stroke:#475569,color:#e2e8f0
    style LAYER1 fill:#1e3a5f,stroke:#3b82f6,color:#bfdbfe
    style LAYER2 fill:#14532d,stroke:#22c55e,color:#bbf7d0
    style LAYER3 fill:#3b0764,stroke:#a855f7,color:#e9d5ff
    style LAYER4 fill:#7f1d1d,stroke:#ef4444,color:#fecaca
    style OUTPUT fill:#064e3b,stroke:#10b981,color:#a7f3d0
```

---

## 🔒 Layer-by-Layer Defense Roles

| Layer | Function | Failure Mode Addressed | Response Time |
|:---:|:---|:---|:---:|
| **L1** Signal Conditioning | Filter noise, reject invalid readings | Sensor corruption, EMI | **< 1 ms** |
| **L2** State Estimation | Track thermal dynamics from physics | Model uncertainty, transients | **10 ms** |
| **L3** AI Correction | Compensate residual modeling errors | Unmodeled nonlinearities | **10 ms** |
| **L4** Safety Layer | Validate output, detect faults, limit range | Any upstream failure | **< 1 ms** |

---

## 🛡️ Cross-Cutting Defense Strategies

| Strategy | How It Works | Why It Matters |
|:---|:---|:---|
| 🔬 **Hybrid Architecture** | Physics gives baseline estimate; AI only corrects the residual error | AI failure → automatic fallback to physics; **never catastrophic** |
| 🚨 **Fault Detection (FDI)** | Sensor range checks + rate-of-change limits + cross-sensor consistency | Faulty sensor isolated within **100 ms** |
| 📊 **Confidence Monitoring** | Mahalanobis distance on AI inputs + observer innovation sequence check | Auto mode-switch **before** error reaches output |
| 🔄 **Graceful Degradation** | 3 operating modes: Full → Physics+Observer → Physics-Only | System **always produces a safe estimate** |

---

## 🔄 Degradation Mode Hierarchy

```mermaid
flowchart TD
    FULL["🟢 FULL MODE\nPhysics + Observer + AI\nAccuracy: ±2 °C"]
    REDUCED["🟡 REDUCED MODE\nPhysics + Observer Only\nAccuracy: ±5 °C"]
    SAFE["🔴 SAFE MODE\nPhysics Only + Conservative Derating\nAccuracy: ±10 °C"]

    FULL -- "AI confidence < threshold\nor AI fault detected" --> REDUCED
    REDUCED -- "Observer divergence\nor sensor fault" --> SAFE
    SAFE -- "Conditions restored\n+ stability confirmed" --> REDUCED
    REDUCED -- "AI confidence restored\n+ validation passed" --> FULL

    style FULL fill:#065f46,stroke:#10b981,color:#fff
    style REDUCED fill:#713f12,stroke:#eab308,color:#fff
    style SAFE fill:#7f1d1d,stroke:#ef4444,color:#fff
```

---

## 🏆 Key Takeaway

> **"This system is not designed for perfect prediction — it is designed for guaranteed safe operation."**
>
> No single module is trusted blindly. Every layer validates the one before it.
> If AI fails → physics holds. If sensors fail → redundancy covers. If the observer drifts → reset logic recovers.
>
> **The system degrades gracefully. It never fails silently.**

---
---

# 🟨 BONUS — Fault Injection & Recovery Scenario

> **Proof that the system recovers autonomously from real-world faults.**

---

## 📊 Infographic: Fault Injection & Recovery Timeline

![Fault injection scenario — Normal operation → Sensor noise + AI OOD injected → System recovers autonomously within 2 seconds](c:/Users/PC-ACER/Documents/Eureka/slides/fault_injection_scenario.png)

---

### Scenario Breakdown

| Phase | Time | What Happens | System Response |
|:---:|:---:|:---|:---|
| 🟢 **Normal** | 0–10 s | System tracks true magnet temperature | Full mode active — accuracy ±2 °C |
| 🔴 **Fault** | 10–20 s | Sensor EMI spike + AI encounters out-of-distribution input | Confidence gate disables AI → physics-only fallback activates within 200 ms |
| 🟢 **Recovery** | 20–30 s | Fault clears, signals stabilize | Confidence check passes → AI re-enabled → full mode restored in < 2 s |

---

> 🔑 **Takeaway:** The system doesn't just survive faults — it **detects, isolates, and recovers** without human intervention.

---

*Eureka Case Challenge — AFTO System | Risk Analysis v3.0 — With Infographics*
