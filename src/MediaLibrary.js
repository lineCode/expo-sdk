// @flow

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { ExponentMediaLibrary: MediaLibrary } = NativeModules;
const eventEmitter = new NativeEventEmitter(MediaLibrary);

type MediaTypeValue = 'audio' | 'photo' | 'video' | 'unknown';
type SortByKey =
  | 'default'
  | 'id'
  | 'mediaType'
  | 'width'
  | 'height'
  | 'creationTime'
  | 'modificationTime'
  | 'duration';
type SortByValue = [SortByKey, boolean] | SortByKey;

type MediaTypeObject = {
  audio: 'audio',
  photo: 'photo',
  video: 'video',
  unknown: 'unknown',
};

type SortByObject = {
  default: 'default',
  id: 'id',
  mediaType: 'mediaType',
  width: 'width',
  height: 'height',
  creationTime: 'creationTime',
  modificationTime: 'modificationTime',
  duration: 'duration',
};

type Asset = {
  id: string,
  filename: string,
  uri: string,
  mediaType: MediaTypeValue,
  mediaSubtypes?: Array<string>, // iOS only
  width: number,
  height: number,
  creationTime: number,
  modificationTime: number,
  duration: number,
  albumId?: string, // Android only
};

type AssetInfo = Asset & {
  localUri?: string,
  location?: Location,
  exif?: Object,
  isFavorite?: boolean, //iOS only
};

type Location = {
  latitude: number,
  longitude: number,
};

type Album = {
  id: string,
  title: string,
  assetCount: number,
  type?: string, // iOS only

  // iOS moments only
  startTime: number,
  endTime: number,
  approximateLocation?: Location,
  locationNames?: Array<string>,
};

type AssetsOptions = {
  first?: number,
  after?: AssetRef,
  album?: AlbumRef,
  sortBy?: Array<SortByValue> | SortByValue,
  mediaType?: Array<MediaTypeValue> | MediaTypeValue,
};

type PagedInfo<T> = {
  assets: Array<T>,
  endCursor: string,
  hasNextPage: boolean,
  totalCount: number,
};

type AssetRef = Asset | string;
type AlbumRef = Album | string;

type Subscription = {
  remove: () => void,
};

function arrayize(item: any): Array<any> {
  if (Array.isArray(item)) {
    return item;
  }
  return item ? [item] : [];
}

function getId(ref): ?string {
  if (typeof ref === 'string') {
    return ref;
  }
  return ref ? ref.id : undefined;
}

function checkAssetIds(assetIds) {
  if (assetIds.some(id => !id || typeof id !== 'string')) {
    throw new Error('Asset ID must be a string!');
  }
}

function checkMediaType(mediaType) {
  if (Object.values(MediaType).indexOf(mediaType) === -1) {
    throw new Error(`Invalid mediaType: ${mediaType}`);
  }
}

function checkSortBy(sortBy) {
  if (Array.isArray(sortBy)) {
    checkSortByKey(sortBy[0]);

    if (typeof sortBy[1] !== 'boolean') {
      throw new Error('Invalid sortBy array argument. Second item must be a boolean!');
    }
  } else {
    checkSortByKey(sortBy);
  }
}

function checkSortByKey(sortBy) {
  if (Object.values(SortBy).indexOf(sortBy) === -1) {
    throw new Error(`Invalid sortBy key: ${sortBy}`);
  }
}

// export constants
export const MediaType: MediaTypeObject = MediaLibrary.MediaType;
export const SortBy: SortByObject = MediaLibrary.SortBy;

export async function createAssetAsync(localUri: string): Promise<Asset> {
  if (!localUri || typeof localUri !== 'string') {
    throw new Error('Invalid argument "localUri". It must be a string!');
  }
  const asset = await MediaLibrary.createAssetAsync(localUri);

  if (Array.isArray(asset)) {
    // Android returns an array with asset, we need to pick the first item
    return asset[0];
  }
  return asset;
}

export async function addAssetsToAlbumAsync(
  assets: Array<AssetRef> | AssetRef,
  album: AlbumRef,
  copy: boolean = true
) {
  const assetIds = arrayize(assets).map(getId);
  const albumId = getId(album);

  checkAssetIds(assetIds);

  if (!albumId || typeof albumId !== 'string') {
    throw new Error('Invalid album ID. It must be a string!');
  }

  if (Platform.OS === 'ios') {
    return MediaLibrary.addAssetsToAlbumAsync(assetIds, albumId);
  }
  return MediaLibrary.addAssetsToAlbumAsync(assetIds, albumId, !!copy);
}

export async function removeAssetsFromAlbumAsync(
  assets: Array<AssetRef> | AssetRef,
  album: AlbumRef
) {
  const assetIds = arrayize(assets).map(getId);
  const albumId = getId(album);

  checkAssetIds(assetIds);
  return MediaLibrary.removeAssetsFromAlbumAsync(assetIds, albumId);
}

export async function deleteAssetsAsync(assets: Array<AssetRef> | AssetRef) {
  const assetIds = arrayize(assets).map(getId);

  checkAssetIds(assetIds);
  return MediaLibrary.deleteAssetsAsync(assetIds);
}

export async function getAssetInfoAsync(asset: AssetRef): Promise<AssetInfo> {
  const assetId = getId(asset);

  checkAssetIds([assetId]);

  const assetInfo = await MediaLibrary.getAssetInfoAsync(assetId);

  if (Array.isArray(assetInfo)) {
    // Android returns an array with asset info, we need to pick the first item
    return assetInfo[0];
  }
  return assetInfo;
}

export async function getAlbumsAsync(): Promise<Array<Album>> {
  return MediaLibrary.getAlbumsAsync();
}

export async function getAlbumAsync(title: string): Promise<Album> {
  if (typeof title !== 'string') {
    throw new Error('Album title must be a string!');
  }
  return MediaLibrary.getAlbumAsync(title);
}

export async function createAlbumAsync(
  albumName: string,
  asset?: AssetRef,
  copyAsset?: boolean = true
): Promise<Album> {
  const assetId = getId(asset);

  if (Platform.OS === 'android' && (typeof assetId !== 'string' || assetId.length === 0)) {
    // it's not possible to create empty album on Android, so initial asset must be provided
    throw new Error('MediaLibrary.createAlbumAsync must be called with an asset on Android.');
  }
  if (!albumName || typeof albumName !== 'string') {
    throw new Error('Invalid argument "albumName". It must be a string!');
  }
  if (assetId != null && typeof assetId !== 'string') {
    throw new Error('Asset ID must be a string!');
  }

  if (Platform.OS === 'ios') return MediaLibrary.createAlbumAsync(albumName, assetId);
  return MediaLibrary.createAlbumAsync(albumName, assetId, !!copyAsset);
}

export async function getAssetsAsync(assetsOptions: AssetsOptions = {}): Promise<PagedInfo<Asset>> {
  const { first, after, album, sortBy, mediaType } = assetsOptions;

  const options = {
    first: first == null ? 20 : first,
    after: getId(after),
    album: getId(album),
    sortBy: arrayize(sortBy),
    mediaType: arrayize(mediaType || [MediaType.photo, MediaType.video]),
  };

  if (first != null && typeof options.first !== 'number') {
    throw new Error('Option "first" must be a number!');
  }
  if (after != null && typeof options.after !== 'string') {
    throw new Error('Option "after" must be a string!');
  }
  if (album != null && typeof options.album !== 'string') {
    throw new Error('Option "album" must be a string!');
  }

  options.sortBy.forEach(checkSortBy);
  options.mediaType.forEach(checkMediaType);

  return MediaLibrary.getAssetsAsync(options);
}

export function addListener(listener: () => void): Subscription {
  // RCTEventEmitter on iOS automatically calls startObserving and stopObserving as listeners are
  // added and removed
  if (Platform.OS === 'android') {
    if (eventEmitter.listeners(MediaLibrary.CHANGE_LISTENER_NAME).length === 0) {
      MediaLibrary.startObserving();
    }
  }

  const subscription = eventEmitter.addListener(MediaLibrary.CHANGE_LISTENER_NAME, listener);
  subscription.remove = () => this.removeSubscription(subscription);
  return subscription;
}

export function removeSubscription(subscription: Subscription): void {
  if (Platform.OS === 'android') {
    if (eventEmitter.listeners(MediaLibrary.CHANGE_LISTENER_NAME).length === 1) {
      MediaLibrary.stopObserving();
    }
  }

  eventEmitter.removeSubscription(subscription);
}

export function removeAllListeners(): void {
  if (Platform.OS === 'android') {
    MediaLibrary.stopObserving();
  }

  eventEmitter.removeAllListeners();
}

// iOS only
export async function getMomentsAsync() {
  if (Platform.OS === 'android') {
    throw new Error('MediaLibrary.getMomentsAsync is not supported on Android!');
  }
  return MediaLibrary.getMomentsAsync();
}
