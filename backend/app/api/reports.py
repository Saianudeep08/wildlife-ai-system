from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.survey import Survey
from app.models.observation import Observation
from app.ml.analytics import (
    shannon_diversity_index,
    ecosystem_health_score,
    conservation_recommendation,
)

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/{survey_id}")
def get_survey_report(
    survey_id: int,
    db: Session = Depends(get_db),
):
    # --------------------------------------------------------
    # SURVEY
    # --------------------------------------------------------

    survey = (
        db.query(Survey)
        .filter(Survey.id == survey_id)
        .first()
    )

    if not survey:
        raise HTTPException(
            status_code=404,
            detail="Survey not found",
        )

    # --------------------------------------------------------
    # OBSERVATIONS
    # --------------------------------------------------------

    observations = (
        db.query(Observation)
        .filter(Observation.survey_id == survey_id)
        .order_by(Observation.created_at)
        .all()
    )

    # --------------------------------------------------------
    # SPECIES DATA
    # --------------------------------------------------------

    species_list = [
        observation.species_detected
        for observation in observations
        if observation.species_detected
    ]

    population_by_species = {}

    for observation in observations:
        species = observation.species_detected or "Unidentified"
        count = observation.count or 1

        population_by_species[species] = (
            population_by_species.get(species, 0) + count
        )

    population_by_species = dict(
        sorted(
            population_by_species.items(),
            key=lambda item: item[1],
            reverse=True,
        )
    )

    total_population = sum(population_by_species.values())

    species_distribution = {}

    if total_population > 0:
        species_distribution = {
            species: round(
                (count / total_population) * 100,
                2,
            )
            for species, count in population_by_species.items()
        }

    # --------------------------------------------------------
    # CONFIDENCE
    # --------------------------------------------------------

    confidence_values = [
        observation.confidence
        for observation in observations
        if observation.confidence is not None
    ]

    average_confidence = (
        round(
            sum(confidence_values)
            / len(confidence_values)
            * 100,
            2,
        )
        if confidence_values
        else 0
    )

    # --------------------------------------------------------
    # DETECTION SOURCES
    # --------------------------------------------------------

    image_observations = sum(
        1
        for observation in observations
        if (observation.source_type or "image").lower()
        == "image"
    )

    audio_observations = sum(
        1
        for observation in observations
        if (observation.source_type or "").lower()
        == "audio"
    )

    other_observations = (
        len(observations)
        - image_observations
        - audio_observations
    )

    source_summary = {
        "image": image_observations,
        "audio": audio_observations,
        "other": other_observations,
    }

    # --------------------------------------------------------
    # BIODIVERSITY
    # --------------------------------------------------------

    diversity_index = shannon_diversity_index(species_list)

    unique_species = len(set(species_list))

    # --------------------------------------------------------
    # ECOSYSTEM HEALTH
    # --------------------------------------------------------
    # These values are baseline indicators because the
    # current database does not contain measured
    # environmental or habitat-quality data.

    species_diversity_score = min(
        diversity_index / 2.0,
        1.0,
    ) * 100

    population_stability_score = 70
    habitat_quality_score = 70
    endangered_status_score = 80
    environmental_conditions_score = 70

    ecosystem_score, conservation_status = ecosystem_health_score(
        species_diversity_score,
        population_stability_score,
        habitat_quality_score,
        endangered_status_score,
        environmental_conditions_score,
    )

    # --------------------------------------------------------
    # RECOMMENDATIONS
    # --------------------------------------------------------

    recommendations = conservation_recommendation(
        diversity_index,
        ecosystem_score,
        unique_species,
    )

    # --------------------------------------------------------
    # HISTORICAL TREND
    # --------------------------------------------------------

    previous_survey = (
        db.query(Survey)
        .filter(
            Survey.monitoring_location
            == survey.monitoring_location,
            Survey.survey_date < survey.survey_date,
        )
        .order_by(Survey.survey_date.desc())
        .first()
    )

    trends = []

    if previous_survey:
        previous_observations = (
            db.query(Observation)
            .filter(
                Observation.survey_id
                == previous_survey.id
            )
            .all()
        )

        previous_population = {}

        for observation in previous_observations:
            species = (
                observation.species_detected
                or "Unidentified"
            )

            count = observation.count or 1

            previous_population[species] = (
                previous_population.get(species, 0)
                + count
            )

        all_species = (
            set(population_by_species)
            | set(previous_population)
        )

        for species in sorted(all_species):
            current_count = population_by_species.get(
                species,
                0,
            )

            previous_count = previous_population.get(
                species,
                0,
            )

            change = current_count - previous_count

            if previous_count == 0 and current_count > 0:
                percentage_change = None
                trend = "Increasing"
            elif previous_count:
                percentage_change = round(
                    (change / previous_count) * 100,
                    2,
                )

                if percentage_change > 10:
                    trend = "Increasing"
                elif percentage_change < -10:
                    trend = "Decreasing"
                else:
                    trend = "Stable"
            else:
                percentage_change = 0
                trend = "Stable"

            trends.append(
                {
                    "species": species,
                    "previous_population": previous_count,
                    "current_population": current_count,
                    "change": change,
                    "percentage_change": percentage_change,
                    "trend": trend,
                }
            )

    # --------------------------------------------------------
    # OBSERVATION DETAILS
    # --------------------------------------------------------

    observation_details = []

    for observation in observations:
        observation_details.append(
            {
                "id": observation.id,
                "species": observation.species_detected
                or "Unidentified",
                "confidence": (
                    round(
                        observation.confidence * 100,
                        2,
                    )
                    if observation.confidence is not None
                    else None
                ),
                "count": observation.count or 1,
                "source_type": (
                    observation.source_type
                    or "image"
                ),
                "created_at": (
                    observation.created_at.isoformat()
                    if observation.created_at
                    else None
                ),
            }
        )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "report_title": "Wildlife Intelligence Report",

        "survey": {
            "id": survey.id,
            "monitoring_location": survey.monitoring_location,
            "latitude": survey.latitude,
            "longitude": survey.longitude,
            "habitat_type": survey.habitat_type,
            "protected_area": survey.protected_area,
            "survey_date": (
                survey.survey_date.isoformat()
                if survey.survey_date
                else None
            ),
        },

        "summary": {
            "total_observations": len(observations),
            "total_population": total_population,
            "unique_species": unique_species,
            "average_confidence": average_confidence,
            "image_observations": image_observations,
            "audio_observations": audio_observations,
            "other_observations": other_observations,
        },

        "species": {
            "population_by_species": population_by_species,
            "distribution": species_distribution,
        },

        "biodiversity": {
            "shannon_diversity_index": diversity_index,
            "unique_species": unique_species,
        },

        "ecosystem": {
            "health_score": ecosystem_score,
            "conservation_status": conservation_status,
        },

        "recommendations": recommendations,

        "detection_sources": source_summary,

        "population_trends": {
            "previous_survey_id": (
                previous_survey.id
                if previous_survey
                else None
            ),
            "status": (
                "Trend Available"
                if previous_survey
                else "Insufficient Data"
            ),
            "trends": trends,
        },

        "observations": observation_details,

        "methodology": {
            "population_note": (
                "Population represents the sum of recorded "
                "observation counts and should not be "
                "interpreted as a census or population-density "
                "estimate."
            ),
            "ecosystem_note": (
                "Ecosystem health includes baseline prototype "
                "indicators for population stability, habitat "
                "quality, endangered status, and environmental "
                "conditions. These values require measured "
                "field data and expert validation for "
                "production ecological assessment."
            ),
            "confidence_note": (
                "Confidence values represent model detection "
                "confidence associated with stored observations."
            ),
        },
    }