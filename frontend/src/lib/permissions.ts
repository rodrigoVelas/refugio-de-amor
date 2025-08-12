export function can(user:any, perms:string[]){
  if (!user) return false
  if (perms.includes('*')) return true
  const up = user.perms || []
  return perms.some(p => up.includes(p))
}
