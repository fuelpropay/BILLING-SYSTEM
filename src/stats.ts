export interface SubscriberStats {
  total: number
  active: number
  suspended: number
  'new': number
  byPlan: Record<string, number>
}
