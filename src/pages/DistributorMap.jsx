import { useMemo } from 'react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default function DistributorMap({ center, zoom, selectedCountry, points }) {
  const pinkPinIcon = useMemo(() => L.divIcon({
    className: 'gelitup-map-pin',
    html: '<span class="gelitup-map-pin__core"></span>',
    iconSize: [24, 34],
    iconAnchor: [12, 34],
    popupAnchor: [0, -28],
  }), [])

  const activePinkPinIcon = useMemo(() => L.divIcon({
    className: 'gelitup-map-pin gelitup-map-pin--active',
    html: '<span class="gelitup-map-pin__core"></span>',
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -34],
  }), [])

  return (
    <>
      <style>{`
        .gelitup-map {
          background: linear-gradient(180deg, #fff7fb 0%, #fff 100%);
        }

        .gelitup-map .leaflet-control-zoom {
          border: 0;
          box-shadow: 0 18px 45px rgba(200, 56, 110, 0.18);
        }

        .gelitup-map .leaflet-control-zoom a {
          color: #7a2946;
          background: rgba(255, 255, 255, 0.96);
        }

        .gelitup-map .leaflet-popup-content-wrapper,
        .gelitup-map .leaflet-popup-tip {
          background: rgba(34, 17, 26, 0.96);
          color: #fff;
          box-shadow: 0 18px 45px rgba(24, 14, 20, 0.22);
        }

        .gelitup-map-pin {
          position: relative;
          width: 24px;
          height: 34px;
        }

        .gelitup-map-pin::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 75% 75% 75% 0;
          background: linear-gradient(180deg, #ff7ab5 0%, #c8386e 100%);
          transform: rotate(-45deg);
          box-shadow: 0 16px 30px rgba(200, 56, 110, 0.35);
        }

        .gelitup-map-pin__core {
          position: absolute;
          top: 6px;
          left: 6px;
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.95);
          z-index: 1;
        }

        .gelitup-map-pin--active {
          width: 28px;
          height: 40px;
        }

        .gelitup-map-pin--active::before {
          box-shadow: 0 20px 36px rgba(200, 56, 110, 0.42);
          filter: saturate(1.08);
        }

        .gelitup-map-pin--active .gelitup-map-pin__core {
          top: 7px;
          left: 7px;
          width: 14px;
          height: 14px;
        }
      `}</style>
      <MapContainer
        key={selectedCountry || 'all-countries'}
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        className="gelitup-map h-[320px] w-full sm:h-[460px]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        {points.map((item) => (
          <Marker
            key={item.country}
            position={item.coordinates}
            icon={selectedCountry === item.country ? activePinkPinIcon : pinkPinIcon}
          >
            <Popup>{item.country}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </>
  )
}
