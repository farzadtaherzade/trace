export const traceTabs = [
  {
    name: 'explore',
    href: '/explore',
    label: 'Explore',
    icons: {
      ios: 'map',
      android: 'explore',
      web: 'explore',
    },
  },
  {
    name: 'trace',
    href: '/trace',
    label: 'Trace',
    icons: {
      ios: 'location.north.circle',
      android: 'my_location',
      web: 'my_location',
    },
  },
  {
    name: 'trips',
    href: '/trips',
    label: 'Trips',
    icons: {
      ios: 'bookmark',
      android: 'bookmarks',
      web: 'bookmarks',
    },
  },
  {
    name: 'goals',
    href: '/goals',
    label: 'Goals',
    icons: {
      ios: 'target',
      android: 'track_changes',
      web: 'track_changes',
    },
  },
  {
    name: 'stores',
    href: '/stores',
    label: 'Stores',
    icons: {
      ios: 'bag.fill',
      android: 'store',
      web: 'store',
    },
  },
  {
    name: 'settings',
    href: '/settings',
    label: 'Settings',
    icons: {
      ios: 'gearshape',
      android: 'settings',
      web: 'settings',
    },
  },
] as const;
