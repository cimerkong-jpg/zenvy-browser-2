/**
 * Generate a numeric ID from UUID for display purposes
 * Uses the profile's creation order (index) starting from 1001
 */
export function getDisplayId(uuid: string, allProfiles: Array<{ id: string; createdAt: number; displayId?: string }>): string {
  const profile = allProfiles.find((item) => item.id === uuid)
  if (profile?.displayId) return profile.displayId

  // If already a numeric ID format, return it
  if (uuid.startsWith('profile-')) {
    return uuid.replace('profile-', '')
  }
  
  // Sort profiles by creation time to get consistent ordering
  const sorted = [...allProfiles].sort((a, b) => a.createdAt - b.createdAt)
  
  // Find the index of this profile
  const index = sorted.findIndex(p => p.id === uuid)
  
  // If found, return index + 1001, otherwise fallback to hash
  if (index !== -1) {
    return (index + 1001).toString()
  }
  
  // Fallback: hash the UUID
  let hash = 0
  for (let i = 0; i < uuid.length; i++) {
    const char = uuid.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  const numericId = Math.abs(hash) % 9000 + 1001
  return numericId.toString()
}
