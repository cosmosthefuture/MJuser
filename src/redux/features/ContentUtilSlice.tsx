import {
  ActionCreatorWithPayload,
  ActionCreatorWithoutPayload,
} from "@reduxjs/toolkit";
import { AppDispatch } from "../store";
import http from "@/redux/http";

export const fetchContent =
  <T,>(
    uri: string,
    setContentStart: ActionCreatorWithoutPayload,
    setContentSuccess: ActionCreatorWithPayload<T>,
    setContentFailure: ActionCreatorWithPayload<string>
  ) =>
  async (dispatch: AppDispatch) => {
    dispatch(setContentStart());

    try {
      const response = await http.fetchDataWithToken(uri);
      console.log(response);

      dispatch(setContentSuccess(response as T));
    } catch (error) {
      console.error("fetchContent error:", error);
      if (error instanceof Error) {
        dispatch(setContentFailure(error.message));
      } else {
        dispatch(setContentFailure("An unknown error occurred"));
      }
    }
  };

export const postContent =
  <T,>(
    uri: string,
    formData: FormData,
    setContentStart: ActionCreatorWithoutPayload,
    setContentSuccess: ActionCreatorWithPayload<T>,
    setContentFailure: ActionCreatorWithPayload<string>
  ) =>
  async (dispatch: AppDispatch) => {
    dispatch(setContentStart());
    try {
      const response = await http.postDataWithOutToken(uri, formData);

      dispatch(setContentSuccess(response as T));
      return response;
    } catch (error) {
      console.error("postContent error:", error);
      if (error instanceof Error) {
        dispatch(setContentFailure(error.message));
      } else {
        dispatch(setContentFailure("An unknown error occurred"));
      }
      throw error;
    }
  };
