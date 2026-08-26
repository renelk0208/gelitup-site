import { useMemo } from 'react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="34" viewBox="0 0 26 34" fill="none">
  <path d="M13 0C5.82 0 0 5.82 0 13c0 8.75 11.4 19.72 12.29 20.56a1 1 0 0 0 1.42 0C14.6 32.72 26 21.75 26 13 26 5.82 20.18 0 13 0z" fill="#c8386e"/>
  <circle cx="13" cy="13" r="5" fill="white" fill-opacity="0.92"/>
</svg>`

const PIN_SVG_ACTIVE = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42" fill="none">
  <path d="M16 0C7.16 0 0 7.16 0 16c0 10.82 14.06 23.89 14.64 24.43a1.93 1.93 0 0 0 2.72 0C17.94 39.89 32 26.82 32 16 32 7.16 24.84 0 16 0z" fill="#a01f54"/>
  <circle cx="16" cy="16" r="6.5" fill="white" fill-opacity="0.95"/>
</svg>`

export default function DistributorMap({ center, zoom, selectedCountry, points }) {
  const pinIcon = useMemo(() => L.divIcon({
    className: '',
    html: PIN_SVG,
    iconSize: [26, 34],
    iconAnchor: [13, 34],
    popupAnchor: [0, -36],
  }), [])

  const activePinIcon = useMemo(() => L.divIcon({
    className: '',
    html: PIN_SVG_ACTIVE,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -44],
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
        .gelitup-map .leaflet-popup-content-wrapper {
          background: rgba(26, 10, 18, 0.97);
          color: #fff;
          border-radius: 14px;
          box-shadow: 0 20px 50px rgba(24, 14, 20, 0.28);
          padding: 0;
          min-width: 220px;
          max-width: 300px;
        }
        .gelitup-map .leaflet-popup-content {
          margin: 0;
        }
        .gelitup-map .leaflet-popup-tip {
          background: rgba(26, 10, 18, 0.97);
        }
        .gelitup-map .leaflet-popup-close-button {
          color: rgba(255,255,255,0.6) !important;
          font-size: 18px !important;
          top: 8px !important;
          right: 10px !important;
        }
        .gelitup-map .leaflet-popup-close-button:hover {
          color: #fff !important;
        }
        .gmap-popup {
          padding: 14px 16px;
          max-height: 300px;
          overflow-y: auto;
          overscroll-behavior: contain;
          scrollbar-color: rgba(224, 97, 138, 0.7) rgba(255, 255, 255, 0.08);
          scrollbar-width: thin;
        }
        .gmap-popup::-webkit-scrollbar {
          width: 6px;
        }
        .gmap-popup::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 999px;
        }
        .gmap-popup::-webkit-scrollbar-thumb {
          background: rgba(224, 97, 138, 0.7);
          border-radius: 999px;
        }
        @media (max-width: 640px) {
          .gmap-popup {
            max-height: 220px;
          }
        }
        .gmap-popup__country {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #e0618a;
          margin-bottom: 10px;
        }
        .gmap-popup__card {
          border-top: 1px solid rgba(255,255,255,0.10);
          padding-top: 8px;
          margin-top: 4px;
        }
        .gmap-popup__card + .gmap-popup__card {
          margin-top: 10px;
        }
        .gmap-popup__name {
          font-size: 12px;
          font-weight: 600;
          color: #fff;
          line-height: 1.35;
        }
        .gmap-popup__line {
          font-size: 11px;
          color: rgba(255,255,255,0.65);
          margin-top: 3px;
          line-height: 1.4;
        }
        .gmap-popup__line a {
          color: #f38bb5;
          text-decoration: none;
        }
        .gmap-popup__line a:hover {
          text-decoration: underline;
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
            icon={selectedCountry === item.country ? activePinIcon : pinIcon}
          >
            <Popup>
              <div className="gmap-popup">
                <p className="gmap-popup__country">{item.country}</p>
                {(item.distributors || []).map((d, i) => (
                  <div key={i} className="gmap-popup__card">
                    <p className="gmap-popup__name">{d.name}</p>
                    {d.address && <p className="gmap-popup__line">{d.address}</p>}
                    {d.phone && <p className="gmap-popup__line">{d.phone}</p>}
                    {d.email && (
                      <p className="gmap-popup__line">
                        <a href={`mailto:${d.email}`}>{d.email}</a>
                      </p>
                    )}
                    {d.website && (
                      <p className="gmap-popup__line">
                        <a href={d.website} target="_blank" rel="noreferrer">{d.website.replace(/^https?:\/\//, '')}</a>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </>
  )
}
