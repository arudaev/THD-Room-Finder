/**
 * THabella wire shapes. The API has no official docs and may change without
 * notice, so every field is optional/nullable and unknown keys are ignored —
 * mirroring the native app's `ignoreUnknownKeys = true` defensive parsing.
 */

export interface InChargeDto {
  firstname?: string | null;
  lastname?: string | null;
  email?: string | null;
}

export interface RoomDto {
  id: number;
  ident: string;
  name: string;
  seatsRegular?: number | null;
  seatsExam?: number | null;
  facilities?: string | null;
  bookable?: boolean | null;
  inCharge?: InChargeDto | null;
  untisLongname?: string | null;
}

export interface PeriodDto {
  id: number;
  startDateTime?: string | null;
  /** Minutes. */
  duration?: number | null;
  eventTypeDescription?: string | null;
  titleText?: string | null;
  /** Map of roomIdent → roomName. THabella returns snake_case; camel seen too. */
  room_ident?: Record<string, string> | null;
  roomIdent?: Record<string, string> | null;
}
