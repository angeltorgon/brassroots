'use strict';

/**
 * @format
 * @flow
 */

/**
 * @module ChangeProfilePhoto
 */

import ImageCropPicker from 'react-native-image-crop-picker';
import ImagePicker from 'react-native-image-picker';
import fetchRemoteURL from '../../../utils/fetchRemoteURL';
import selectPhoto from '../../../utils/selectPhoto';
import * as actions from './actions';
import {addEntities} from '../../entities/AddEntities';
import {type ThunkAction} from '../../../reducers/users';
import {type Blob} from '../../../utils/brassrootsTypes';
import {
  type FirebaseInstance,
  type FirestoreInstance,
  type StorageRef,
  type StorageUploadTask,
} from '../../../utils/firebaseTypes';

/**
 * Async function that changes the profile photo for the current user
 * 
 * @async
 * @function changeProfilePhoto
 * 
 * @author Aldo Gonzalez <aldo@tunerinc.com>
 *
 * @param    {string}  userID The user id of the current user
 *
 * @returns  {Promise}
 * @resolves {string}         The profile photo uri to save for the current user
 * @rejects  {Error}          The error which caused the change profile photo failure
 */
export function changeProfilePhoto(
  userID: string,
): ThunkAction {
  return async (dispatch, _, {getFirebase, getFirestore}) => {
    const firebase: FirebaseInstance = getFirebase();
    const firestore: FirestoreInstance = getFirestore();
    const storage: StorageRef = firebase.storage().ref();

    try {
      const photoURI: string = await selectPhoto('Change Profile Photo');

      if (photoURI !== 'cancelled') {
        const croppedImage = await ImageCropPicker.openCropper(
          {
            path: photoURI,
            width: 640,
            height: 640,
            cropperToolbarTitle: 'Crop Image',
          },
        );

        dispatch(actions.request());

        const blob: Blob = await fetchRemoteURL(croppedImage.path, 'blob');
        await storage.child(`profileImages/${userID}`).delete();
        const uploadTask: StorageUploadTask = storage.child(`profileImages/${userID}`).put(blob);
        await uploadTask;
        const profileImage: string = await uploadTask.snapshot.ref.getDownloadURL();
        const promises = [
          firestore.collection('users').doc(userID).update({ profileImage }),
          ImageCropPicker.clean(),
        ];

        await Promise.all(promises);
        dispatch(addEntities({users: {[userID]: {id: userID, profileImage}}}));
      }

      dispatch(actions.success());
    } catch (err) {
      dispatch(actions.failure(err));
    }
  };
}
