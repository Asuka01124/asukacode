export interface IconSegment {
  color: string
  text: string
}

export interface IconDefinition {
  name: string
  description: string
  rows: IconSegment[][]
}
