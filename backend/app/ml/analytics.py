import math
from collections import Counter

def shannon_diversity_index(species_list: list[str]) -> float:
    """Higher value = more species diversity in the observed data."""
    species_list = [s for s in species_list if s]  # drop None/empty entries
    counts = Counter(species_list)
    total = sum(counts.values())
    if total == 0:
        return 0.0
    index = -sum((n / total) * math.log(n / total) for n in counts.values())
    return round(index, 3)

def ecosystem_health_score(species_diversity, population_stability, habitat_quality,
                            endangered_status, environmental_conditions):
    """Weighted score per the project spec's scoring model."""
    score = (
        species_diversity * 0.30 +
        population_stability * 0.25 +
        habitat_quality * 0.20 +
        endangered_status * 0.15 +
        environmental_conditions * 0.10
    )
    if score >= 85:
        status = "Excellent"
    elif score >= 70:
        status = "Healthy"
    elif score >= 50:
        status = "Moderate Concern"
    elif score >= 30:
        status = "Vulnerable"
    else:
        status = "Critical"
    return round(score, 2), status
def conservation_recommendation(diversity_index: float, health_score: float, unique_species: int) -> list[str]:
    """Simple rule-based recommendations from the biodiversity data."""
    recommendations = []

    if health_score < 50:
        recommendations.append("Critical priority: schedule an immediate habitat assessment for this site.")
    elif health_score < 70:
        recommendations.append("Increase monitoring frequency to track population trends more closely.")
    else:
        recommendations.append("Ecosystem indicators are stable; maintain current monitoring schedule.")

    if diversity_index < 1.0:
        recommendations.append("Low species diversity detected — investigate potential habitat degradation or human disturbance.")

    if unique_species <= 1:
        recommendations.append("Very few species recorded — consider deploying additional camera traps or audio sensors at this site.")

    if not recommendations:
        recommendations.append("No immediate action required; continue routine monitoring.")

    return recommendations