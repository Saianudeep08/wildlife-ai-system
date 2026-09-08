from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.observation import Observation
from app.ml.analytics import (
    shannon_diversity_index,
    ecosystem_health_score,
    conservation_recommendation,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/biodiversity/{survey_id}")
def get_biodiversity(
    survey_id: int,
    db: Session = Depends(get_db)
):
    observations = (
        db.query(Observation)
        .filter(Observation.survey_id == survey_id)
        .all()
    )

    # ----------------------------------------------------
    # SPECIES LIST
    # ----------------------------------------------------

    species_list = [
        observation.species_detected
        for observation in observations
        if observation.species_detected
    ]

    diversity_index = shannon_diversity_index(species_list)

    # ----------------------------------------------------
    # POPULATION INTELLIGENCE
    # ----------------------------------------------------

    population_by_species = {}

    for observation in observations:
        species = observation.species_detected or "Unidentified"
        count = observation.count or 1

        population_by_species[species] = (
            population_by_species.get(species, 0) + count
        )

    total_population = sum(population_by_species.values())

    # Sort species by population, highest first.
    population_by_species = dict(
        sorted(
            population_by_species.items(),
            key=lambda item: item[1],
            reverse=True,
        )
    )

    # ----------------------------------------------------
    # SPECIES DISTRIBUTION
    # ----------------------------------------------------

    species_distribution = {}

    if total_population > 0:
        species_distribution = {
            species: round(
                (count / total_population) * 100,
                2
            )
            for species, count in population_by_species.items()
        }

    # ----------------------------------------------------
    # ECOSYSTEM HEALTH
    # ----------------------------------------------------

    species_diversity_score = min(
        diversity_index / 2.0,
        1.0
    ) * 100

    # These are currently baseline values because the
    # database does not yet contain measured environmental
    # or habitat-quality data.
    population_stability_score = 70
    habitat_quality_score = 70
    endangered_status_score = 80
    environmental_conditions_score = 70

    score, status = ecosystem_health_score(
        species_diversity_score,
        population_stability_score,
        habitat_quality_score,
        endangered_status_score,
        environmental_conditions_score,
    )

    # ----------------------------------------------------
    # CONSERVATION RECOMMENDATIONS
    # ----------------------------------------------------

    recommendations = conservation_recommendation(
        diversity_index,
        score,
        len(set(species_list)),
    )

    # ----------------------------------------------------
    # RESPONSE
    # ----------------------------------------------------

    return {
        "survey_id": survey_id,
        "total_observations": len(observations),
        "total_population": total_population,
        "population_by_species": population_by_species,
        "species_distribution": species_distribution,
        "unique_species": len(set(species_list)),
        "shannon_diversity_index": diversity_index,
        "ecosystem_health_score": score,
        "conservation_status": status,
        "recommendations": recommendations,
    }


@router.get("/population-trends/{survey_id}")
def get_population_trends(
    survey_id: int,
    db: Session = Depends(get_db)
):
    from app.models.survey import Survey

    # ----------------------------------------------------
    # CURRENT SURVEY
    # ----------------------------------------------------

    current_survey = (
        db.query(Survey)
        .filter(Survey.id == survey_id)
        .first()
    )

    if not current_survey:
        return {
            "survey_id": survey_id,
            "status": "Survey not found",
            "trends": [],
        }

    # ----------------------------------------------------
    # SURVEYS AT SAME LOCATION
    # ----------------------------------------------------

    surveys = (
        db.query(Survey)
        .filter(
            Survey.monitoring_location
            == current_survey.monitoring_location
        )
        .order_by(Survey.survey_date)
        .all()
    )

    if len(surveys) < 2:
        return {
            "survey_id": survey_id,
            "status": "Insufficient Data",
            "message": (
                "At least two surveys are required "
                "to calculate population trends."
            ),
            "trends": [],
        }

    # ----------------------------------------------------
    # FIND PREVIOUS SURVEY
    # ----------------------------------------------------

    previous_survey = None

    for survey in surveys:
        if survey.id == survey_id:
            break

        previous_survey = survey

    if previous_survey is None:
        return {
            "survey_id": survey_id,
            "status": "Insufficient Data",
            "message": (
                "No previous survey is available "
                "for comparison."
            ),
            "trends": [],
        }

    # ----------------------------------------------------
    # CURRENT OBSERVATIONS
    # ----------------------------------------------------

    current_observations = (
        db.query(Observation)
        .filter(
            Observation.survey_id == survey_id
        )
        .all()
    )

    # ----------------------------------------------------
    # PREVIOUS OBSERVATIONS
    # ----------------------------------------------------

    previous_observations = (
        db.query(Observation)
        .filter(
            Observation.survey_id == previous_survey.id
        )
        .all()
    )

    # ----------------------------------------------------
    # POPULATION CALCULATION
    # ----------------------------------------------------

    def get_population(observations):
        population = {}

        for observation in observations:
            species = (
                observation.species_detected
                or "Unidentified"
            )

            count = observation.count or 1

            population[species] = (
                population.get(species, 0) + count
            )

        return population

    current_population = get_population(
        current_observations
    )

    previous_population = get_population(
        previous_observations
    )

    # ----------------------------------------------------
    # SPECIES COMPARISON
    # ----------------------------------------------------

    all_species = (
        set(current_population)
        | set(previous_population)
    )

    trends = []

    for species in sorted(all_species):
        current_count = current_population.get(
            species,
            0
        )

        previous_count = previous_population.get(
            species,
            0
        )

        change = (
            current_count - previous_count
        )

        if previous_count == 0 and current_count > 0:
            percentage_change = None
            trend = "Increasing"

        else:
            percentage_change = (
                round(
                    (change / previous_count) * 100,
                    2
                )
                if previous_count
                else 0
            )

            if percentage_change > 10:
                trend = "Increasing"

            elif percentage_change < -10:
                trend = "Decreasing"

            else:
                trend = "Stable"

        trends.append({
            "species": species,
            "previous_population": previous_count,
            "current_population": current_count,
            "change": change,
            "percentage_change": percentage_change,
            "trend": trend,
        })

    # ----------------------------------------------------
    # RESPONSE
    # ----------------------------------------------------

    return {
        "survey_id": survey_id,
        "previous_survey_id": previous_survey.id,
        "status": "Trend Available",
        "trends": trends,
    }