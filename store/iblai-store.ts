/**
 * Redux store: the SDK's RTK Query caches + the slices its components expect,
 * plus the three SIS slices — the DM, the LMS and Studio.
 */
import { configureStore } from "@reduxjs/toolkit";
import { coreApiSlice, mentorReducer, mentorMiddleware } from "@iblai/iblai-js/data-layer";
import {
  hostChatReducer,
  chatInputSliceReducer,
  chatSliceReducerShared,
  filesReducer,
  rbacReducer,
  subscriptionReducer,
  topBannerReducer,
} from "@iblai/iblai-js/web-utils";
import { sisApi } from "@/lib/sis/api";
import { lmsApi } from "@/lib/sis/lms-api";
import { studioApi } from "@/lib/sis/studio-api";

export const iblaiStore = configureStore({
  reducer: {
    [coreApiSlice.reducerPath]: coreApiSlice.reducer,
    ...mentorReducer,
    [sisApi.reducerPath]: sisApi.reducer,
    [lmsApi.reducerPath]: lmsApi.reducer,
    [studioApi.reducerPath]: studioApi.reducer,

    // The SDK selectors hard-code these slice keys — do not rename them.
    chat: hostChatReducer,
    chatInput: chatInputSliceReducer,
    chatSliceShared: chatSliceReducerShared,
    files: filesReducer,
    rbac: rbacReducer,
    subscription: subscriptionReducer,
    topBanner: topBannerReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false })
      .concat(coreApiSlice.middleware)
      .concat(sisApi.middleware)
      .concat(lmsApi.middleware)
      .concat(studioApi.middleware)
      .concat(...mentorMiddleware),
});

export type IblaiRootState = ReturnType<typeof iblaiStore.getState>;
export type IblaiAppDispatch = typeof iblaiStore.dispatch;
