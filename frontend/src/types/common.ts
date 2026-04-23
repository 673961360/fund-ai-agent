export type Identifier = string
export type ISODateTimeString = string

export interface TraceMetadata {
  request_id?: Identifier
  trace_id?: Identifier
}

export interface AttachmentPlaceholder {
  attachment_id: Identifier
  file_name: string
  media_type?: string | null
  file_size_bytes?: number | null
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}
