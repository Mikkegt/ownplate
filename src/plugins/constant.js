export const order_status = {
  error: 0,
  new_order: 100, // by user
  validation_ok: 200, // by functions
  order_placed: 300,  // by user and stripe
  order_accepted: 400, // by restaurant
  cooking_completed: 500, // by restaurant
  customer_picked_up: 600, // by restaurant and stripe
  order_canceled: 700, // by restaurant or user
  order_refunded: 800 // by restaurant
};

export const order_error = {
  validation_error: 100,
  order_canceled_by_customer: 200,
  payment_error: 300,
  order_canceled_by_restaurant: 400,
  unknow_error: 900,
};

export const stripe_regions = {
  "US": {
    langs: ["en", "es"], // first one is default
    currency: 'USD',
    multiple: 100,
    hidePostalCode: false,
    allergens: [
      "gluten", "crustacean", "egg", "milk", "fish", "peanuts", "soybeans", "shellfish", "raw"
    ]
  },
  "EU": {
    langs: ["en", "fr", "es", "it", "de", "nl"],
    currency: 'EUR',
    multiple: 100,
    hidePostalCode: false,
    allergens: [
      "gluten", "crustacean", "egg", "milk", "lupin", "mollusc"
    ]
  },
  "JP": {
    langs: ["ja"],
    currency: 'JPY',
    multiple: 1,
    hidePostalCode: true
  }
};

export const daysOfWeek = {
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
  7: "sunday",
};

export const USStates = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming"
];
