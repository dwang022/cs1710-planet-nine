import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

# Load the dataset
df = pd.read_csv("data/processed/tnos.csv")

# Convert necessary columns to numeric
for col in ["a_au", "q_au", "data_arc_days"]:
    df[col] = pd.to_numeric(df[col], errors="coerce")

# Keep distant objects with valid orbital measurements
df = df.dropna(subset=["a_au", "q_au", "data_arc_days"])

df = df[
    (df["a_au"] > 30) &
    (df["a_au"] < 1000) &
    (df["q_au"] > 30) &
    (df["data_arc_days"] > 0)
].copy()

# Convert observation arc length to years
df["arc_years"] = df["data_arc_days"] / 365.25

# Divide objects into groups based on orbital size
bins = [30, 50, 100, 150, 250, 1000]
labels = ["30-50", "50-100", "100-150", "150-250", "250-1000"]

df["distance_group"] = pd.cut(
    df["a_au"],
    bins=bins,
    labels=labels
)

# Calculate median observation arc for each group
summary = df.groupby(
    "distance_group", observed=True
)["arc_years"].agg(["median", "count"])

print("\nObservation history by orbital size:")
print(summary)

# Create visualization
plt.figure(figsize=(10, 6))

bars = plt.bar(
    summary.index.astype(str),
    summary["median"],
    color="mediumpurple",
    edgecolor="black",
    alpha=0.8
)

# Display sample size above each bar
for bar, count in zip(bars, summary["count"]):
    plt.text(
        bar.get_x() + bar.get_width() / 2,
        bar.get_height() + 0.15,
        f"n={count}",
        ha="center",
        fontsize=10
    )

plt.xlabel("Semi-major axis (AU)")
plt.ylabel("Median observation arc length (years)")
plt.title("Are More Distant Orbits Observed for Less Time?")
plt.grid(axis="y", alpha=0.3)
plt.tight_layout()

plt.savefig("gabe_insight3.png", dpi=300)
plt.show()

# Calculate correlation
correlation = df["a_au"].corr(
    df["arc_years"],
    method="spearman"
)

print("\nObjects analyzed:", len(df))
print("Spearman correlation:", round(correlation, 3))
