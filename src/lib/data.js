export const CATEGORIES = ['Interior', 'Exterior', 'Missing Paperwork', 'Possible Critical Issues']
 
export const SPACE_TYPES = [
  'Boiler Room',
  'Clean Utility Room',
  'Conference Room',
  'Corridor / Hallway',
  'Dining Room',
  'Electrical Room',
  'Elevator Room',
  'Employee Lounge',
  'Generator Room',
  'Housekeeping Closet',
  'Housekeeping Room',
  'Janitor Closet',
  'Kitchen',
  'Lobby',
  'Main Entrance Vestibule',
  'Maintenance Shop',
  'Medicine Room',
  'Nourishment Room',
  'Oxygen Closet',
  'Public Bathroom',
  'Resident Room',
  'Resident Room Bathroom',
  'Salon Room',
  'Shower Room',
  'Soiled Utility Room',
  'Sprinkler Room',
  'Staff Bathroom',
  'Storage Room',
  'Therapy Room',
]
 
export const INTERIOR_ISSUES = [
  'Install Missing Escutcheon',
  'Install Missing Grab Bar',
  'Paint Wall',
  'Remove Plungers from Resident Rooms',
  'Repair Call Light / Pull Cord',
  'Repair Ceiling Tiles',
  'Repair Damaged Baseboard',
  'Repair Damaged Door',
  'Repair Damaged Flooring',
  'Repair Damaged Wallpaper',
  'Repair Damaged Window',
  'Repair Emergency Lighting',
  'Repair Exposed Wiring',
  'Repair Handrail',
  'Repair Hole in Wall',
  'Repair Leaking Pipe',
  'Repair Light Switch / Cover Plate',
  'Repair Missing Smoke Detector',
  'Repair Sink',
  'Repair Sprinkler Head',
  'Repair Toilet',
  'Repair Vanity',
  'Replace Door Hardware / Lock',
  'Replace Exit Sign',
  'Replace Missing Floor Tile',
  'Replace Missing Outlet Cover Plate',
]
 
export const EXTERIOR_ISSUES = [
  'Clean Gutters',
  'Clean Roof Drains',
  'Repair Broken Fence',
]
 
export const CRITICAL_ISSUES = [
  'ADA Bathroom Issues',
  'ADA Parking Issues',
  'Dumpster Not on Concrete Pad',
  'Scald Protection',
  'Trees / Brush Touching Building',
]
 
// Sort a list alphabetically, but float the most used items to the top
// usageCounts is an object like { 'Repair Ceiling Tiles': 7, 'Paint Wall': 3 }
export function sortByUsage(list, usageCounts = {}) {
  if (!usageCounts || Object.keys(usageCounts).length === 0) return list
  return [...list].sort((a, b) => {
    const countA = usageCounts[a] || 0
    const countB = usageCounts[b] || 0
    if (countB !== countA) return countB - countA // most used first
    return a.localeCompare(b) // then alphabetical
  })
}
