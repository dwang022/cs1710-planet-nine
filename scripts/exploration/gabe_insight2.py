import pandas as pd
import matplotlib.pyplot as plt

# Load dataset
df = pd.read_csv("data/processed/tnos.csv")

# Convert first observation date to a year
df["first_obs"] = pd.to_datetime(df["first_obs"], errors="coerce")
df["year"] = df["first_obs"].dt.year

# Keep objects with valid discovery years
df = df.dropna(subset=["year"])
df = df[(df["year"] >= 1990) & (df["year"] <= 2026)]

# Count objects by first observation year
yearly_counts = df.groupby("year").size()

# Create visualization
plt.figure(figsize=(11, 5))
plt.bar(yearly_counts.index, yearly_counts.values, color="steelblue")

plt.xlabel("Year of first observation")
plt.ylabel("Number of objects")
plt.title("Trans-Neptunian Objects First Observed Each Year")
plt.grid(axis="y", alpha=0.3)
plt.tight_layout()

# Save the graph
plt.savefig("gabe_insight2.png", dpi=300)
plt.show()

# Print summary statistics
print("Total objects:", len(df))
print("Year with most first observations:", yearly_counts.idxmax())
print("Maximum annual count:", yearly_counts.max())
