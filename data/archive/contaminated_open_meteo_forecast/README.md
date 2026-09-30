# Contaminated Forecast Archive (Scientific Notice)

These files were retrieved from Open-Meteo's historical forecast API without specifying 'models=gfs_seamless'. In this mode, Open-Meteo defaulted to retrospective ERA5 reanalysis, resulting in 100% artificial equality with ERA5-Land observation targets. These files are scientifically invalid for independent NWP evaluation.
