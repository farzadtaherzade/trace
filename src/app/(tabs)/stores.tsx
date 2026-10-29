import { SymbolView } from 'expo-symbols';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, TextInput, View } from 'react-native';
import type { Region } from 'react-native-maps';
import * as Location from 'expo-location';

import { MapCanvas } from '@/components/map-canvas';

import {
  Card,
  EmptyState,
  IconButton,
  PrimaryButton,
  Screen,
  ScreenHeader,
  TraceText,
} from '@/components/ui';
import {
  addReward,
  addStore,
  checkInStore,
  deleteStore,
  listStores,
  updateStore,
  type Store,
} from '@/lib/db';
import { formatDistance, haversineMeters, type Units } from '@/lib/geo';
import { i18n } from '@/lib/i18n';
import { useLanguage } from '@/providers/language-provider';
import { useTheme } from '@/providers/theme-provider';
import { getUnits } from '@/lib/units';

const DEFAULT_REGION: Region = {
  latitude: 35.6892,
  longitude: 51.389,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#151515' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#232323' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1b2a' }] },
];

const CHECK_IN_RADIUS_M = 100;

export default function StoresScreen() {
  const { t } = useLanguage();
  const { colors } = useTheme();

  const [stores, setStores] = useState<Store[] | null>(null);
  const [units, setUnits] = useState<Units>('metric');
  const [pending, setPending] = useState<{ lat: number; lng: number } | null>(null);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [currentCoord, setCurrentCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [justCheckedIn, setJustCheckedIn] = useState(false);

  useEffect(() => {
    if (!justCheckedIn) {
      return;
    }
    const timeout = setTimeout(() => setJustCheckedIn(false), 4000);
    return () => clearTimeout(timeout);
  }, [justCheckedIn]);

  const load = useCallback(async () => {
    const [loadedStores, loadedUnits] = await Promise.all([listStores(), getUnits()]);
    setStores(loadedStores);
    setUnits(loadedUnits);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      void Location.getLastKnownPositionAsync()
        .then((position) => {
          if (position) {
            setCurrentCoord({ lat: position.coords.latitude, lng: position.coords.longitude });
          }
        })
        .catch(() => {});
    }, [load]),
  );

  const handleSave = async () => {
    if (pending) {
      await addStore(name.trim() || t('stores.title'), pending.lat, pending.lng, note.trim() || null);
      setPending(null);
    } else if (editingStore) {
      await updateStore(editingStore.id, {
        name: name.trim() || editingStore.name,
        note: note.trim() || null,
      });
      setEditingStore(null);
    }
    setName('');
    setNote('');
    await load();
  };

  const closeStoreForm = () => {
    setPending(null);
    setEditingStore(null);
    setName('');
    setNote('');
  };

  const handleEdit = (store: Store) => {
    setEditingStore(store);
    setPending(null);
    setName(store.name);
    setNote(store.note ?? '');
  };

  const handleDelete = (store: Store) => {
    Alert.alert(t('stores.deleteConfirmTitle'), t('stores.deleteConfirmMessage'), [
      { text: t('stores.cancel'), style: 'cancel' },
      {
        text: t('stores.delete'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await deleteStore(store.id);
            if (editingStore?.id === store.id) {
              setEditingStore(null);
              setName('');
              setNote('');
            }
            await load();
          })();
        },
      },
    ]);
  };

  const handleCheckIn = async (store: Store) => {
    await checkInStore(store.id);
    await addReward('store', `store-${store.id}`, null);
    setJustCheckedIn(true);
    await load();
  };

  const distanceTo = (store: Store) => {
    if (!currentCoord) {
      return null;
    }
    return haversineMeters(currentCoord.lat, currentCoord.lng, store.lat, store.lng);
  };

  return (
    <Screen contentClassName="flex-1 pb-gutter" edges={['top', 'right', 'left']}>
      <ScreenHeader subtitle={t('stores.subtitle')} title={t('stores.title')} />

      <View className="h-64 overflow-hidden">
        <MapCanvas
          accessibilityLabel={t('stores.title')}
          darkStyle={DARK_MAP_STYLE}
          initialRegion={DEFAULT_REGION}
          markers={[
            ...(stores ?? []).map((store) => ({
              key: `store-${store.id}`,
              coordinate: { latitude: store.lat, longitude: store.lng },
              color: store.checkedInAt ? colors.accent : colors.danger,
            })),
            ...(pending
              ? [
                  {
                    key: 'pending',
                    coordinate: { latitude: pending.lat, longitude: pending.lng },
                    color: colors.accent,
                  },
                ]
              : []),
          ]}
          muted
          onLongPress={
            editingStore
              ? undefined
              : (coordinate) => {
                  setPending({ lat: coordinate.latitude, lng: coordinate.longitude });
                  setJustCheckedIn(false);
                }
          }
          showsUserLocation
          style={{ flex: 1 }}
        />
      </View>

      {pending || editingStore ? (
        <View className="px-gutter pt-3">
          <Card className="gap-3">
            <TraceText variant="label" tone="dim">
              {pending ? t('stores.markHint') : t('stores.editHint')}
            </TraceText>
            <TextInput
              accessibilityLabel={t('stores.namePlaceholder')}
              onChangeText={setName}
              placeholder={t('stores.namePlaceholder')}
              placeholderTextColor={colors.textDim}
              value={name}
              style={inputStyle(colors)}
            />
            <TextInput
              accessibilityLabel={t('stores.notePlaceholder')}
              onChangeText={setNote}
              placeholder={t('stores.notePlaceholder')}
              placeholderTextColor={colors.textDim}
              value={note}
              style={inputStyle(colors)}
            />
            <View className="flex-row gap-3">
              <PrimaryButton
                className="flex-1"
                label={t('stores.cancel')}
                onPress={closeStoreForm}
              />
              <PrimaryButton
                className="flex-1"
                label={t('stores.save')}
                onPress={() => void handleSave()}
              />
            </View>
          </Card>
        </View>
      ) : null}

      <ScrollView className="flex-1" contentContainerClassName="gap-card px-gutter pb-8 pt-3">
        {stores === null ? (
          <View className="items-center justify-center py-8">
            <SymbolView name={{ android: 'store', ios: 'bag.fill', web: 'store' }} size={28} tintColor={colors.accent} />
          </View>
        ) : stores.length === 0 ? (
          <EmptyState
            icon={
              <SymbolView
                name={{ android: 'store', ios: 'bag.fill', web: 'store' }}
                size={28}
                tintColor={colors.accent}
              />
            }
            message={t('stores.emptyMessage')}
            title={t('stores.emptyTitle')}
          />
        ) : (
          stores.map((store) => {
            const distance = distanceTo(store);
            const near = distance !== null && distance <= CHECK_IN_RADIUS_M;
            const checkedIn = store.checkedInAt !== null;

            return (
              <Card key={store.id} className="gap-2">
                <View className="flex-row items-center gap-3">
                  <View
                    className="h-10 w-10 items-center justify-center rounded-pill"
                    style={{ backgroundColor: colors.accentDim }}>
                    <SymbolView
                      name={{ android: 'store', ios: 'bag.fill', web: 'store' }}
                      size={20}
                      tintColor={checkedIn ? colors.accent : colors.textDim}
                    />
                  </View>
                  <View className="flex-1 gap-1">
                    <TraceText numberOfLines={1} variant="heading">
                      {store.name}
                    </TraceText>
                    {store.note ? (
                      <TraceText numberOfLines={1} tone="dim" variant="caption">
                        {store.note}
                      </TraceText>
                    ) : null}
                  </View>
                  {distance !== null ? (
                    <TraceText tone="dim" variant="caption">
                      {formatDistance(distance, units)}
                    </TraceText>
                  ) : null}
                  <View className="flex-row">
                    <IconButton
                      accessibilityLabel={t('stores.edit')}
                      icon={
                        <SymbolView
                          name={{ android: 'edit', ios: 'pencil', web: 'edit' }}
                          size={18}
                          tintColor={colors.textDim}
                        />
                      }
                      onPress={() => handleEdit(store)}
                    />
                    <IconButton
                      accessibilityLabel={t('stores.delete')}
                      icon={
                        <SymbolView
                          name={{ android: 'delete', ios: 'trash', web: 'delete' }}
                          size={18}
                          tintColor={colors.danger}
                        />
                      }
                      onPress={() => handleDelete(store)}
                    />
                  </View>
                </View>

                {checkedIn ? (
                  <View className="flex-row items-center gap-2">
                    <SymbolView
                      name={{ android: 'check_circle', ios: 'checkmark.circle.fill', web: 'check_circle' }}
                      size={18}
                      tintColor={colors.accent}
                    />
                    <TraceText tone="accent" variant="caption" style={{ color: colors.accent }}>
                      {t('stores.checkedIn')}
                    </TraceText>
                  </View>
                ) : near ? (
                  <PrimaryButton
                    label={t('stores.checkIn')}
                    onPress={() => void handleCheckIn(store)}
                    size="small"
                  />
                ) : (
                  <TraceText tone="dim" variant="caption">
                    {i18n.t('stores.tooFar', {
                      distance: formatDistance(CHECK_IN_RADIUS_M, units),
                    })}
                  </TraceText>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>

      {justCheckedIn ? (
        <View className="absolute inset-x-0 bottom-6 px-gutter">
          <Card className="items-center gap-1" style={{ backgroundColor: colors.accentDim }}>
            <TraceText variant="heading" style={{ color: colors.accent }}>
              {t('stores.treatUnlocked')}
            </TraceText>
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

function inputStyle(colors: { card: string; border: string; text: string; textDim: string }) {
  return {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  };
}
