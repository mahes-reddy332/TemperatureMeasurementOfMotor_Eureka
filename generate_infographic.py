import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

fig, ax = plt.subplots(figsize=(12, 8))
ax.set_xlim(0, 100)
ax.set_ylim(0, 100)
ax.axis('off')

# Styling
bg_color = '#0d1117'
box_color_phys = '#0F3B4A'
box_color_ai = '#2B1B54'
box_color_fusion = '#bc8cff'
box_color_result = '#f85149'
text_color = '#e6edf3'
fig.patch.set_facecolor(bg_color)

def draw_box(x, y, w, h, text, color):
    p_bbox = FancyBboxPatch((x, y), w, h,
                            boxstyle="round,pad=1.5",
                            ec="#8b949e", fc=color, lw=1.5, zorder=2)
    ax.add_patch(p_bbox)
    ax.text(x + w/2, y + h/2, text, ha='center', va='center', 
            color=text_color, fontsize=12, fontweight='bold', zorder=3, linespacing=1.6)

# Title
ax.text(50, 95, 'CogniCAD: Step-by-Step Validation Score ($V_c$) Calculation',
        ha='center', va='center', color='#58a6ff', fontsize=18, fontweight='bold')

# Boxes
draw_box(35, 78, 30, 8, "CAD Input Feature\nWall Thickness t=1.0mm\nRequired $t_{req}=2.0mm$", '#161b22')

draw_box(10, 52, 35, 12, "1. Physics Rule Engine\n$\Phi_{rule} = ReLU((t_{req} - t)/t_{req})$\n$\Phi_{rule} = (2.0 - 1.0)/2.0 = 0.50$\nRule Weight $\\alpha = 0.5$", box_color_phys)

draw_box(55, 52, 35, 12, "2. AI Validation Engine (GNN)\n$P_{failure} = Sigmoid(W \\cdot h^{(L)} + b)$\n$P_{failure} = 0.70$\nAI Weight $\\beta = 0.5$", box_color_ai)

draw_box(20, 27, 60, 12, "3. Hybrid Component Fusion ($V_c$)\n$V_c = \\alpha \cdot \Phi_{rule} + \\beta \cdot P_{failure}$\n$V_c = (0.5 \\times 0.50) + (0.5 \\times 0.70)$", box_color_fusion)

draw_box(35, 2, 30, 12, "4. Final Risk Score\n$V_c = 0.60$\n(60% Critical Risk)\nDecision: REJECT", box_color_result)

# Flow Arrows
# Input to Phys & AI
ax.annotate("", xy=(27, 65), xytext=(45, 77), arrowprops=dict(arrowstyle="->", color="#8b949e", lw=2))
ax.annotate("", xy=(73, 65), xytext=(55, 77), arrowprops=dict(arrowstyle="->", color="#8b949e", lw=2))

# Phys & AI to Fusion
ax.annotate("", xy=(40, 40), xytext=(27, 51), arrowprops=dict(arrowstyle="->", color="#8b949e", lw=2))
ax.annotate("", xy=(60, 40), xytext=(73, 51), arrowprops=dict(arrowstyle="->", color="#8b949e", lw=2))

# Fusion to Result
ax.annotate("", xy=(50, 15), xytext=(50, 26), arrowprops=dict(arrowstyle="->", color="#8b949e", lw=2))

plt.savefig('calculations_infographic.png', dpi=300, bbox_inches='tight', facecolor=bg_color)
print('Successfully generated calculations_infographic.png')
