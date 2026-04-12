

# Real-Time PMSM Magnet Temperature Estimation System

**Hybrid physics + observer + AI estimation for live permanent-magnet synchronous motor thermal monitoring.**

A production-style engineering dashboard that estimates PMSM magnet temperature in real time using a physics-based thermal model, observer fusion, and AI residual correction, with a live React + FastAPI interface.

---

## 📖 Overview

High-speed PMSM drives operate in harsh thermal conditions. Magnet temperature is one of the most important but hardest-to-measure quantities in the system, because direct sensing is expensive, slow, and often impractical in production hardware.

This project solves that problem by combining:

- A **physics-based thermal model** for baseline temperature estimation
- An **EKF / flux-based observer** for dynamic state refinement
- An **AI residual correction layer** to compensate for model mismatch
- A **real-time dashboard** to visualize live motor telemetry and the estimation pipeline

Why this matters:

- Prevents demagnetization and thermal runaway
- Improves drive safety and diagnostics
- Demonstrates a practical hybrid AI + physics architecture
- Mirrors how modern automotive control software is built

---

## 🧠 System Architecture

The pipeline is designed as a real PMSM estimation architecture, not a generic ML demo.

```text
Motor
  ↓
Signals (V, I, ω)
  ↓
Signal Conditioning
  ↓
Feature Extraction
  ↓
      ┌──────────────────────────────┐
      │                              │
      ↓                              ↓
LPTN Thermal Model            EKF / Flux Observer
      └───────────────┬──────────────┘
                      ↓
              Fusion Block
          (weighted / EKF fusion)
                      ↓
              AI Residual Model
             (correction layer)
                      ↓
           Temperature Output
```

### Pipeline logic

- **Motor** generates the electro-mechanical operating state.
- **Signals (V, I, ω)** are the primary telemetry inputs.
- **Signal conditioning** cleans and stabilizes raw data.
- **Feature extraction** derives the thermal and dynamic features needed by the estimators.
- **LPTN thermal model** estimates the magnet temperature using lumped thermal network behavior.
- **EKF / flux observer** provides a complementary state estimate from the drive dynamics.
- **Fusion block** combines the two estimates into one robust temperature estimate.
- **AI residual model** corrects remaining model mismatch and bias.
- **Temperature output** is the final magnet temperature displayed live in the dashboard.

---

<img width="3277" height="2564" alt="validation_summary" src="https://github.com/user-attachments/assets/05b4898d-994d-4079-92fe-f82e11bddc24" />

## ⚙️ Tech Stack

### Frontend
- **React** – functional UI layer
- **Tailwind CSS** – utility-first styling
- **Framer Motion** – lightweight animation support
- **SVG / charts** – visual flow and telemetry plots

### Backend
- **FastAPI** – API and WebSocket server
- **WebSockets** – real-time telemetry streaming
- **Python** – simulation and estimation logic

### Modeling / ML
- **NumPy** style numerical modeling concepts
- **PyTorch / Scikit-learn ready** for future AI residual training
- Physics-driven thermal estimation with residual learning

### Visualization
- Real-time **SVG system pipeline**
- Telemetry charts for temperature, current, and speed
- Live state indicators and fault injection controls

---

<img width="3277" height="4304" alt="afto_simulation_results" src="https://github.com/user-attachments/assets/fc027a0f-b082-4f8f-97cf-cabb254ef044" />

## 🚀 Features

- **Real-time data simulation** of motor speed, current, voltage, and temperature
- **Hybrid estimation** combining physics, observer, and AI correction
- **Interactive flow visualization** with live data updates
- **Fault tolerance / graceful degradation** when the stream disconnects
- **Fault injection controls** for normal, spike, load, and noise modes
- **Engineering-style dashboard** suitable for demos and reviews
- **Live temperature monitoring** with final output temperature display

---

## 🧮 Mathematical Model

The system uses a simplified thermal relationship to model motor temperature rise.

### Thermal equation

$$
\frac{dT}{dt} = \frac{1}{C_{th}}\left(P_{loss} - \frac{T - T_{amb}}{R_{th}}\right)
$$

Where:
- $T$ = motor temperature
- $T_{amb}$ = ambient temperature
- $C_{th}$ = thermal capacitance
- $R_{th}$ = thermal resistance
- $P_{loss}$ = estimated motor loss power

### Loss model

A simplified loss estimate is used in the simulation:

$$
P_{loss} = 0.02 I^2 + 0.000005 \omega^2
$$

Where:
- $I$ = current
- $\omega$ = speed

### AI correction concept

The AI residual model learns the mismatch between the physics/observer estimate and the true temperature:

$$
T_{final} = T_{base} - \Delta T_{AI}
$$

Where:
- $T_{base}$ = fused baseline temperature estimate
- $\Delta T_{AI}$ = learned residual correction

This hybrid structure keeps the system interpretable while reducing bias and drift.

---

## 📊 Demo / UI

### Main dashboard

The UI includes:

- A **live flow diagram** showing the full estimation pipeline
- **Live metrics** for voltage, current, speed, and estimated temperature
- A **temperature output** area driven by the backend stream
- A **fault injector panel** for testing different motor conditions
- A **trend chart panel** for observing runtime behavior over time

### Visual placeholders

Replace the following placeholders with exported screenshots from your app:


### Suggested screenshots to include
- Flow diagram in normal mode
- Fault injector active state
- Temperature trend graph
- High-noise condition

### `docs/images/` asset folder

Store exported visuals in this folder so the README stays portable and GitHub-ready:

```text
docs/images/
├── system-architecture.png
├── live-dashboard.png
├── telemetry-trends.png
├── flow-diagram.png
└── fault-injector.png
```

Recommended image set:

- `system-architecture.png` - Overview of the PMSM estimation pipeline
- `live-dashboard.png` - Main React dashboard with live telemetry
- `telemetry-trends.png` - Temperature / speed / current charts
- `flow-diagram.png` - Full hybrid flow architecture close-up
- `fault-injector.png` - Fault modes and stream control panel

---

## 🏗️ Project Structure

```text
TemperatureMeasurementOfMotor_Eureka/
├── backend/
│   └── main.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── afto_simulation.py
├── afto_validation.py
├── afto_estimator.h
├── calculations.md
├── slides/
└── README.md
```

### Key folders

- **backend/** – FastAPI WebSocket telemetry server
- **frontend/** – React dashboard and visualization layer
- **components/** – UI modules for flow diagram, metrics, and charts
- **slides/** – presentation support materials
- **simulation / validation files** – supporting notebooks, scripts, and plots

---

## ⚡ Installation & Setup

### 1) Clone the repository

```bash
git clone https://github.com/mahes-reddy332/TemperatureMeasurementOfMotor_Eureka.git
cd TemperatureMeasurementOfMotor_Eureka
```

### 2) Set up the backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Backend endpoints:
- WebSocket stream: `ws://localhost:8000/ws`
- Fault trigger: `http://localhost:8000/trigger/{mode}`

Available trigger modes:
- `normal`
- `spike`
- `load`
- `noise`

### 3) Set up the frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend default URL:
- `http://localhost:5173`

### 4) Run the full project

Start both servers together:

- Backend: `python main.py` from `backend/`
- Frontend: `npm run dev` from `frontend/`

### 5) Optional production build

```bash
cd frontend
npm run build
```

---

## 🔮 Future Improvements

- Real sensor integration from a physical PMSM test bench
- Edge deployment for embedded control hardware
- More advanced AI residual models
- Parameter auto-identification from field data
- Multi-speed and multi-load validation datasets
- Exportable reports and downloadable telemetry snapshots
- Mobile-friendly monitoring mode

---

## 🏆 Why This Project Stands Out

- **Hybrid intelligence**: combines physics, observers, and AI rather than relying on one method
- **Real-time design**: demonstrates live streaming, not offline batch inference
- **Industry relevance**: directly maps to automotive motor thermal safety use cases
- **Explainable architecture**: each stage in the pipeline can be justified technically
- **Presentation-ready**: strong for demos, interviews, and technical evaluations

---

## 📌 Notes

- The backend currently uses a simulated motor plant for live telemetry generation.
- The frontend visualizes the live stream and supports fault injection for testing estimation behavior.
- The AI correction layer is represented conceptually in the current implementation and can be replaced with a trained model later.

---

## 📄 License

This project is provided for demonstration and engineering evaluation purposes. Add your preferred license before publishing publicly.

---

## 🤝 Acknowledgements

Built as a real-time engineering dashboard for PMSM temperature estimation research and demonstration.
