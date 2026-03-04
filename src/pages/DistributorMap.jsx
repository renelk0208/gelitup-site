import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

export default function DistributorMap({ center, zoom, selectedCountry, points }) {
  return (
    <MapContainer
      key={selectedCountry || 'all-countries'}
      center={center}
      zoom={zoom}
      scrollWheelZoom={false}
      className="h-[320px] w-full sm:h-[420px]"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((item) => (
        <Marker key={item.country} position={item.coordinates}>
          <Popup>{item.country}</Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
