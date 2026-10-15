# Stage 1: Build & Publish .NET 8 API
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["InfraSentinel.Api/InfraSentinel.Api.csproj", "InfraSentinel.Api/"]
RUN dotnet restore "InfraSentinel.Api/InfraSentinel.Api.csproj"

COPY . .
WORKDIR "/src/InfraSentinel.Api"
RUN dotnet publish "InfraSentinel.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Runtime Container
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Production

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "InfraSentinel.Api.dll"]
