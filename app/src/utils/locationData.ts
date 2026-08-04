export interface CountryOption {
  name: string;
  code: string;
}

export interface TimeZoneOption {
  label: string;
  value: string;
}

export const COUNTRIES: CountryOption[] = [
  { name: 'United States', code: 'US' },
  { name: 'Canada', code: 'CA' },
  { name: 'United Kingdom', code: 'GB' },
  { name: 'Mexico', code: 'MX' },
  { name: 'Spain', code: 'ES' },
  { name: 'Argentina', code: 'AR' },
  { name: 'Brazil', code: 'BR' },
  { name: 'Colombia', code: 'CO' },
  { name: 'Chile', code: 'CL' },
  { name: 'Peru', code: 'PE' },
  { name: 'France', code: 'FR' },
  { name: 'Germany', code: 'DE' },
  { name: 'Italy', code: 'IT' },
  { name: 'Portugal', code: 'PT' },
  { name: 'Netherlands', code: 'NL' },
  { name: 'Poland', code: 'PL' },
  { name: 'Romania', code: 'RO' },
  { name: 'Ukraine', code: 'UA' },
  { name: 'Japan', code: 'JP' },
  { name: 'China', code: 'CN' },
  { name: 'South Korea', code: 'KR' },
  { name: 'India', code: 'IN' },
  { name: 'Philippines', code: 'PH' },
  { name: 'Vietnam', code: 'VN' },
  { name: 'Indonesia', code: 'ID' },
  { name: 'Thailand', code: 'TH' },
  { name: 'Egypt', code: 'EG' },
  { name: 'Kenya', code: 'KE' },
  { name: 'South Africa', code: 'ZA' },
  { name: 'Australia', code: 'AU' },
  { name: 'New Zealand', code: 'NZ' },
  { name: 'Other / Not Listed', code: 'XX' }
];

export const TIME_ZONES: TimeZoneOption[] = [
  { label: 'UTC-12:00 International Date Line West', value: 'UTC-12:00' },
  { label: 'UTC-11:00 Midway Island, Samoa', value: 'UTC-11:00' },
  { label: 'UTC-10:00 Hawaii', value: 'UTC-10:00' },
  { label: 'UTC-09:00 Alaska', value: 'UTC-09:00' },
  { label: 'UTC-08:00 Pacific Time (US & Canada)', value: 'UTC-08:00' },
  { label: 'UTC-07:00 Mountain Time (US & Canada)', value: 'UTC-07:00' },
  { label: 'UTC-06:00 Central Time (US & Canada), Mexico City', value: 'UTC-06:00' },
  { label: 'UTC-05:00 Eastern Time (US & Canada), Bogota, Lima', value: 'UTC-05:00' },
  { label: 'UTC-04:00 Atlantic Time (Canada), Caracas, Santiago', value: 'UTC-04:00' },
  { label: 'UTC-03:30 Newfoundland', value: 'UTC-03:30' },
  { label: 'UTC-03:00 Brasilia, Buenos Aires, Montevideo', value: 'UTC-03:00' },
  { label: 'UTC-02:00 Mid-Atlantic', value: 'UTC-02:00' },
  { label: 'UTC-01:00 Azores, Cape Verde Islands', value: 'UTC-01:00' },
  { label: 'UTC+00:00 London, Dublin, Lisbon, GMT', value: 'UTC+00:00' },
  { label: 'UTC+01:00 Berlin, Madrid, Paris, Rome, Warsaw', value: 'UTC+01:00' },
  { label: 'UTC+02:00 Athens, Bucharest, Cairo, Helsinki, Kyiv', value: 'UTC+02:00' },
  { label: 'UTC+03:00 Moscow, Istanbul, Riyadh, Nairobi', value: 'UTC+03:00' },
  { label: 'UTC+03:30 Tehran', value: 'UTC+03:30' },
  { label: 'UTC+04:00 Dubai, Baku, Tbilisi', value: 'UTC+04:00' },
  { label: 'UTC+04:30 Kabul', value: 'UTC+04:30' },
  { label: 'UTC+05:00 Tashkent, Karachi', value: 'UTC+05:00' },
  { label: 'UTC+05:30 New Delhi, Mumbai, Bengaluru (IST)', value: 'UTC+05:30' },
  { label: 'UTC+05:45 Kathmandu', value: 'UTC+05:45' },
  { label: 'UTC+06:00 Dhaka, Almaty', value: 'UTC+06:00' },
  { label: 'UTC+06:30 Yangon', value: 'UTC+06:30' },
  { label: 'UTC+07:00 Bangkok, Hanoi, Jakarta', value: 'UTC+07:00' },
  { label: 'UTC+08:00 Beijing, Hong Kong, Singapore, Taipei', value: 'UTC+08:00' },
  { label: 'UTC+09:00 Tokyo, Seoul, Osaka', value: 'UTC+09:00' },
  { label: 'UTC+09:30 Adelaide, Darwin', value: 'UTC+09:30' },
  { label: 'UTC+10:00 Sydney, Melbourne, Brisbane', value: 'UTC+10:00' },
  { label: 'UTC+11:00 Solomon Islands, New Caledonia', value: 'UTC+11:00' },
  { label: 'UTC+12:00 Auckland, Fiji', value: 'UTC+12:00' }
];
