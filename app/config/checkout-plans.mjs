// Public checkout codes map to existing database keys without moving provider IDs.
export const checkoutPlans = Object.freeze({
  basico: Object.freeze({ storedId: 'basico', name: 'Básico' }),
  professional: Object.freeze({ storedId: 'intermediario', name: 'Professional' }),
  business: Object.freeze({ storedId: 'professional', name: 'Business' }),
});
