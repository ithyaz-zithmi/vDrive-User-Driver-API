-- Migration: Create driver_location_history table
-- Purpose: Log every location point during active trips for replay, disputes, and analytics

CREATE TABLE IF NOT EXISTS driver_location_history (
    id              BIGSERIAL PRIMARY KEY,
    trip_id         VARCHAR(100) NOT NULL,
    driver_id       VARCHAR(100) NOT NULL,
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    location        geography(Point, 4326),
    speed           DOUBLE PRECISION,        -- m/s if available from GPS
    heading         DOUBLE PRECISION,        -- bearing in degrees
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast trip replay queries (all points for a trip, ordered by time)
CREATE INDEX IF NOT EXISTS idx_location_history_trip_id ON driver_location_history(trip_id, recorded_at ASC);

-- Index for driver-based analytics
CREATE INDEX IF NOT EXISTS idx_location_history_driver_id ON driver_location_history(driver_id, recorded_at DESC);

-- Spatial index for geospatial queries (optional but useful for heatmaps)
CREATE INDEX IF NOT EXISTS idx_location_history_geo ON driver_location_history USING GIST(location);
