const { query } = require('./src/config/db');

async function run() {
  try {
    console.log("Clearing today's trips and attendance...");
    
    // Clear trip overrides
    const res1 = await query(`DELETE FROM trip_student_overrides`);
    console.log(`Deleted ${res1.rowCount} trip student overrides`);
    
    // Clear attendance
    const res2 = await query(`DELETE FROM attendance_records WHERE date = CURRENT_DATE`);
    console.log(`Deleted ${res2.rowCount} attendance records for today`);
    
    // Clear trips
    const res3 = await query(`DELETE FROM trips WHERE trip_date = CURRENT_DATE`);
    console.log(`Deleted ${res3.rowCount} trips for today`);
    
    // Reset all buses to idle and clear current_trip_id
    const res4 = await query(`UPDATE buses SET current_trip_id = NULL, status = 'idle'`);
    console.log(`Reset ${res4.rowCount} buses`);
    
    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
