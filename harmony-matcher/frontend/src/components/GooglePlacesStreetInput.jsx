import React, { useState } from 'react';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';

const libraries = ['places'];

function PlainStreetInput({ value, onChange, placeholder, className }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      placeholder={placeholder}
    />
  );
}

function GooglePlacesAutocompleteInput({ value, onChange, placeholder, className, apiKey }) {
  const [autocompleteRef, setAutocompleteRef] = useState(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries,
  });

  const handlePlaceChanged = () => {
    if (autocompleteRef) {
      const place = autocompleteRef.getPlace();
      if (place?.formatted_address) {
        onChange(place.formatted_address);
      }
    }
  };

  if (loadError) {
    return <PlainStreetInput value={value} onChange={onChange} placeholder={placeholder} className={className} />;
  }

  if (!isLoaded) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        placeholder="جاري تحميل..."
      />
    );
  }

  return (
    <Autocomplete
      onLoad={(inst) => setAutocompleteRef(inst)}
      onPlaceChanged={handlePlaceChanged}
      options={{
        componentRestrictions: { country: 'il' },
        types: ['address'],
        fields: ['formatted_address', 'address_components'],
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        placeholder={placeholder}
      />
    </Autocomplete>
  );
}

export default function GooglePlacesStreetInput({ value, onChange, placeholder, className }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    return (
      <PlainStreetInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
      />
    );
  }

  return (
    <GooglePlacesAutocompleteInput
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      apiKey={apiKey}
    />
  );
}
