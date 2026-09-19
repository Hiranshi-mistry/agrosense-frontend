export type GeoLocation = {
  name: string
  latitude: number
  longitude: number
  country?: string
  admin1?: string
}

export type WeatherSnapshot = {
  location: GeoLocation
  current: {
    temperature: number
    humidity: number
    precipitation: number
    windSpeed: number
    cloudCover: number
    weatherCode: number
  }
  daily: Array<{
    date: string
    min: number
    max: number
    precipitation: number
    probability: number
    weatherCode: number
  }>
  fetchedAt: string
}

const API_BASE = 'https://api.open-meteo.com/v1/forecast'
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'

export async function searchLocations(query: string): Promise<GeoLocation[]> {
  if (!query.trim()) return []
  const response = await fetch(`${GEOCODING_URL}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`)
  if (!response.ok) throw new Error('Unable to search locations')
  const data = await response.json()
  return (data.results ?? []).map((item: GeoLocation) => ({
    name: item.name, latitude: item.latitude, longitude: item.longitude, country: item.country, admin1: item.admin1,
  }))
}

export async function getWeather(location: GeoLocation): Promise<WeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: String(location.latitude), longitude: String(location.longitude), timezone: 'auto',
    current: 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,cloud_cover,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code',
    forecast_days: '7', temperature_unit: 'celsius', wind_speed_unit: 'kmh', precipitation_unit: 'mm',
  })
  const response = await fetch(`${API_BASE}?${params}`)
  if (!response.ok) throw new Error('Unable to fetch weather data')
  const data = await response.json()
  return {
    location,
    current: {
      temperature: data.current.temperature_2m, humidity: data.current.relative_humidity_2m,
      precipitation: data.current.precipitation, windSpeed: data.current.wind_speed_10m,
      cloudCover: data.current.cloud_cover, weatherCode: data.current.weather_code,
    },
    daily: data.daily.time.map((date: string, index: number) => ({
      date, min: data.daily.temperature_2m_min[index], max: data.daily.temperature_2m_max[index],
      precipitation: data.daily.precipitation_sum[index], probability: data.daily.precipitation_probability_max[index],
      weatherCode: data.daily.weather_code[index],
    })),
    fetchedAt: new Date().toISOString(),
  }
}

export function weatherLabel(code: number) {
  if (code === 0) return 'Clear sky'
  if ([1, 2].includes(code)) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if ([45, 48].includes(code)) return 'Foggy'
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle'
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain'
  if ([95, 96, 99].includes(code)) return 'Thunderstorm'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow'
  return 'Mixed conditions'
}
