import os
import httpx
import asyncio

class WeatherService:
    def __init__(self):
        self.api_key = os.getenv("WEATHER_API_KEY")
        self.base_url = "http://api.weatherapi.com/v1"
        if not self.api_key:
            print("Warning: WEATHER_API_KEY not found in environment variables.")

    async def get_weather(self, location: str):
        """
        Fetches current weather and forecast for a given location asynchronously.
        """
        if not self.api_key:
            return {"error": "Weather API key not configured"}

        url = f"{self.base_url}/forecast.json"
        params = {
            "key": self.api_key,
            "q": location,
            "days": 1, 
            "aqi": "no",
            "alerts": "no"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                return self.preprocess_weather_data(data)
            except httpx.RequestError as e:
                print(f"Weather API Request Error: {e}")
                return {"error": f"Failed to connect to Weather API: {str(e)}"}
            except httpx.HTTPStatusError as e:
                print(f"Weather API Status Error: {e}")
                return {"error": f"Weather API returned error: {e.response.status_code}"}
            except Exception as e:
                 print(f"Weather Service Error: {e}")
                 return {"error": f"An unexpected error occurred: {str(e)}"}

    def preprocess_weather_data(self, raw_data):
        """
        Extracts only essential parameters:
        temperature, humidity, wind_speed, rainfall_probability, daily_max_temp, daily_min_temp
        """
        if not raw_data or "error" in raw_data:
            return raw_data

        try:
            current = raw_data.get("current", {})
            forecast = raw_data.get("forecast", {}).get("forecastday", [])[0].get("day", {})
            
            processed = {
                "temperature": current.get("temp_c"),
                "humidity": current.get("humidity"),
                "wind_speed": current.get("wind_kph"),
                "condition": current.get("condition", {}).get("text"),
                "daily_max_temp": forecast.get("maxtemp_c"),
                "daily_min_temp": forecast.get("mintemp_c"),
                "rainfall_probability": forecast.get("daily_chance_of_rain")
            }
            return processed
        except Exception as e:
             print(f"Error preprocessing weather data: {e}")
             return {"error": "Failed to process weather data"}

    async def get_forecast_for_prediction(self, location: str, days: int = 3):
        """
        Fetch multi-day forecast formatted for the pest/disease forecasting engine.
        
        Free WeatherAPI plan supports up to 3 days.
        Pro plan supports up to 14 days — just change the days parameter.
        
        Returns a list of daily weather dicts:
        [
            {
                "date": "2026-04-05",
                "temp_max": 34.2,
                "temp_min": 22.1,
                "temp_mean": 28.15,
                "humidity": 65,
                "rainfall_mm": 0.0,
                "rainfall_chance": 12,
                "condition": "Partly cloudy",
                "wind_kph": 15.2,
                "uv_index": 7
            },
            ...
        ]
        """
        if not self.api_key:
            return {"error": "Weather API key not configured"}

        # Clamp to free tier limit
        days = min(days, 3)

        url = f"{self.base_url}/forecast.json"
        params = {
            "key": self.api_key,
            "q": location,
            "days": days,
            "aqi": "no",
            "alerts": "no"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params, timeout=15.0)
                response.raise_for_status()
                data = response.json()
                return self._process_forecast_for_prediction(data)
            except httpx.RequestError as e:
                print(f"Weather Forecast API Request Error: {e}")
                return {"error": f"Failed to connect to Weather API: {str(e)}"}
            except httpx.HTTPStatusError as e:
                print(f"Weather Forecast API Status Error: {e}")
                return {"error": f"Weather API returned error: {e.response.status_code}"}
            except Exception as e:
                print(f"Weather Forecast Service Error: {e}")
                return {"error": f"An unexpected error occurred: {str(e)}"}

    def _process_forecast_for_prediction(self, raw_data):
        """Convert raw WeatherAPI forecast response into forecaster-compatible format."""
        if not raw_data or "error" in raw_data:
            return raw_data

        try:
            forecast_days = raw_data.get("forecast", {}).get("forecastday", [])
            result = []

            for day_data in forecast_days:
                day = day_data.get("day", {})
                date_str = day_data.get("date", "")

                # Calculate average humidity from hourly data if available
                hourly = day_data.get("hour", [])
                avg_humidity = day.get("avghumidity", 50)
                if hourly:
                    humidities = [h.get("humidity", 50) for h in hourly]
                    avg_humidity = sum(humidities) / len(humidities)

                temp_max = day.get("maxtemp_c", 30)
                temp_min = day.get("mintemp_c", 20)

                result.append({
                    "date": date_str,
                    "temp_max": temp_max,
                    "temp_min": temp_min,
                    "temp_mean": round((temp_max + temp_min) / 2, 1),
                    "humidity": round(avg_humidity),
                    "rainfall_mm": day.get("totalprecip_mm", 0),
                    "rainfall_chance": day.get("daily_chance_of_rain", 0),
                    "condition": day.get("condition", {}).get("text", ""),
                    "wind_kph": day.get("maxwind_kph", 0),
                    "uv_index": day.get("uv", 0),
                })

            return result
        except Exception as e:
            print(f"Error processing forecast for prediction: {e}")
            return {"error": "Failed to process forecast data"}

# Usage example (for testing)
if __name__ == "__main__":
    async def main():
        service = WeatherService()
        weather = await service.get_weather("Pune")
        print(weather)
    
    # asyncio.run(main()) 
