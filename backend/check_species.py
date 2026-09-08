import pandas as pd

df = pd.read_csv("SnapshotSerengeti_v2_1_annotations.csv")

# Show species and how many rows (images) each has
counts = df["question__species"].value_counts()
print(counts.head(30))