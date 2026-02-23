export { type BadgeColor } from './badge-color'

export {
  addressFieldsSchema,
  addressWithOptionalApartmentSchema,
  addressWithNullableApartmentSchema,
  addressWithNullableOnlyApartmentSchema,
  addressFieldsOptionalStreetSchema,
  addressOptionalStreetWithOptionalApartmentSchema,
  addressOptionalStreetWithNullableApartmentSchema,
} from './address-schema'

export {
  chilePhoneSchema,
  optionalChilePhoneSchema,
  CHILE_PHONE_REGEX,
  PHONE_ERROR_MESSAGE,
} from './phone-schema'

export {
  baseTagSchema,
  baseTagWithOptionalAbbreviationSchema,
  generateAbbreviation,
  tagToFormValues,
  normalizeTagPayload,
  type BaseTag,
  type BaseTagFormValues,
  type BaseTagPayload,
} from './tag-schema'
