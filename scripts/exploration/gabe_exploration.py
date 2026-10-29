import pandas as pd
import matplotlib.pyplot as plt

# Load the team's dataset
df = pd.read_csv("data/processed/tnos.csv")

# Focus on extreme trans-Neptunian objects
df = df[
    (df["orbit_class"] == "TNO") &
    (df["a_au"] > 150) &
    (df["q_au"] > 30)
].copy()

# Convert observation arc from days to years
df["arc_years"] = df["data_arc_days"] / 365.25

# Compare well-determined and less certain orbits
groups = [
    df.loc[df["well_determined"] == True, "arc_years"].dropna(),
    df.loc[df["well_determined"] == False, "arc_years"].dropna()
]

plt.figure(figsize=(8, 5))
plt.boxplot(groups, tick_labels=["Well-determined", "Not well-determined"])

plt.ylabel("Observation arc length (years)")
plt.title("Observation History of Extreme Trans-Neptunian Objects")
plt.grid(axis="y", alpha=0.3)
plt.tight_layout()
plt.show()

# Print useful statistics
print("Number of objects:", len(df))
print(df.groupby("well_determined")["arc_years"].median())
