/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Add columns to trips table
  pgm.addColumns('trips', {
    scheduled_status: { type: 'VARCHAR(20)', notNull: true, default: 'OPEN' },
    re_dispatch_count: { type: 'INTEGER', notNull: true, default: 0 },
    one_hour_reminder_sent: { type: 'BOOLEAN', notNull: true, default: false },
  }, { ifNotExists: true });

  // 2. Add columns to drivers table
  pgm.addColumns('drivers', {
    has_scheduled_ride: { type: 'BOOLEAN', notNull: true, default: false },
    next_scheduled_time: { type: 'TIMESTAMP', notNull: false },
  }, { ifNotExists: true });

  // 3. Backfill scheduled_status for existing ACCEPTED scheduled rides
  pgm.sql(`
    UPDATE trips 
    SET scheduled_status = 'ASSIGNED' 
    WHERE booking_type = 'SCHEDULED' AND trip_status = 'ACCEPTED'
  `);

  // 4. Sycnronize has_scheduled_ride and next_scheduled_time for drivers
  pgm.sql(`
    WITH latest_scheduled AS (
      SELECT DISTINCT ON (driver_id) 
        driver_id, 
        scheduled_start_time
      FROM trips
      WHERE booking_type = 'SCHEDULED' 
        AND trip_status = 'ACCEPTED'
        AND scheduled_start_time > NOW()
      ORDER BY driver_id, scheduled_start_time ASC
    )
    UPDATE drivers d
    SET 
      has_scheduled_ride = TRUE,
      next_scheduled_time = ls.scheduled_start_time
    FROM latest_scheduled ls
    WHERE d.id = ls.driver_id
  `);
};

exports.down = (pgm) => {
  pgm.dropColumns('trips', ['scheduled_status', 're_dispatch_count', 'one_hour_reminder_sent'], { ifExists: true });
  pgm.dropColumns('drivers', ['has_scheduled_ride', 'next_scheduled_time'], { ifExists: true });
};
