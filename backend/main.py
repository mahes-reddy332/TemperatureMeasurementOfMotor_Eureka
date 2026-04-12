import asyncio
import random
import time
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import math

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class MotorPlant:
    def __init__(self):
        self.T_true = 80.0
        self.T_amb = 25.0
        self.C_th = 5.0  
        self.R_th = 1.5  
        self.omega = 3000.0  
        self.I = 25.0        
        self.V = 300.0       
        self.mode = "normal"
        self.noise_level = 0.5
        
        # Thermal network cascaded nodes
        self.T_winding = 85.0
        self.T_stator = 82.0
        self.T_housing = 30.0
        
    def step(self, dt=5.0):
        if self.mode == "normal":
            self.omega += random.uniform(-200, 200)
            self.I += random.uniform(-5, 5)
        elif self.mode == "spike":
            self.I = random.uniform(50, 60)
        elif self.mode == "load":
            self.omega = random.uniform(1000, 1500)
            self.I = random.uniform(40, 50)
            
        self.omega = max(500, min(6000, self.omega))
        self.I = max(5, min(70, self.I))
        self.V = 200 + (self.omega / 6000) * 150 + random.uniform(-5, 5)
        
        P_loss = 0.02 * (self.I ** 2) + 0.000005 * (self.omega ** 2)
        
        dT = (dt / self.C_th) * (P_loss - (self.T_true - self.T_amb) / self.R_th)
        self.T_true += dT
        self.T_true = max(self.T_amb, min(250.0, self.T_true))
        
        # Simulated 4-Node LPTN
        self.T_winding = self.T_true + (P_loss * 0.4) + random.uniform(-0.5, 0.5)
        self.T_stator = self.T_true + (P_loss * 0.15) + random.uniform(-0.2, 0.2)
        self.T_housing = self.T_amb + (self.T_true * 0.1) + random.uniform(-0.1, 0.1)
        
        # Physical Flux Linkage
        flux_linkage = 0.08 * (1 - 0.0012 * (self.T_true - 20)) + random.uniform(-0.001, 0.001)

        I_meas = self.I + random.gauss(0, self.noise_level)
        V_meas = self.V + random.gauss(0, self.noise_level * 5)
        omega_meas = self.omega + random.gauss(0, self.noise_level * 2)
        
        return I_meas, V_meas, omega_meas, self.T_true, self.T_winding, self.T_stator, self.T_housing, flux_linkage

class ECUObserver:
    def __init__(self):
        self.T_est = 80.0
        
    def estimate(self, I, V, omega, dt=5.0):
        C_th_est = 4.0   
        R_th_est = 1.8
        
        P_loss = 0.02 * (I ** 2) + 0.000005 * (omega ** 2)
        dT = (dt / C_th_est) * (P_loss - (self.T_est - 25.0) / R_th_est)
        
        self.T_est += dT
        self.T_est = max(25.0, min(250.0, self.T_est))
        
        ai_correction = (self.T_est * 0.05) - (omega * 0.001) + (I * 0.1)
        ai_correction = max(-15.0, min(15.0, ai_correction))
        
        # Adaptive Trust Weight based on Speed
        trust_weight = max(0.0, min(1.0, (omega - 1000) / 4000.0)) + random.uniform(-0.02, 0.02)
        
        T_base = self.T_est + random.uniform(-0.5, 0.5)
        T_final = self.T_est - ai_correction + random.uniform(-0.2, 0.2)
        
        return T_base, T_final, ai_correction, trust_weight

plant = MotorPlant()
ecu = ECUObserver()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            I, V, omega, T_true, T_wind, T_stat, T_hous, flux = plant.step()
            T_base, T_final, ai_correction, trust = ecu.estimate(I, V, omega)
            
            packet = {
                "timestamp": int(time.time() * 1000),
                "I": round(I, 2),
                "V": round(V, 2),
                "omega": round(omega, 0),
                "T_true": round(T_true, 2),
                "T_base": round(T_base, 2),
                "T_final": round(T_final, 2),
                "ai_correction": round(ai_correction, 2),
                "T_winding": round(T_wind, 2),
                "T_stator": round(T_stat, 2),
                "T_housing": round(T_hous, 2),
                "flux_linkage": round(flux, 4),
                "trust_weight": round(trust, 2),
                "err_ekf": round(T_base - T_true, 2),
                "err_afto": round(T_final - T_true, 2),
                "noise_level": plant.noise_level,
                "mode": plant.mode
            }
            try:
                await websocket.send_text(json.dumps(packet))
            except Exception:
                # Client disconnected between loop iterations.
                break
            await asyncio.sleep(0.5) 
            
    except WebSocketDisconnect:
        pass

@app.get("/trigger/{mode}")
def trigger_mode(mode: str):
    if mode in ["normal", "spike", "load"]:
        plant.mode = mode
        if mode == "normal":
            plant.noise_level = 0.5
    elif mode == "noise":
        plant.noise_level = 8.0
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
