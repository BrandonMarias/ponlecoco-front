import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UpdateNameRequest {
  name: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateNameResponse {
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
    photoUrl?: string;
  };
}

export interface UpdateProfilePictureResponse {
  message: string;
  photoUrl: string;
  user: {
    id: string;
    name: string;
    email: string;
    photoUrl: string;
  };
}

export interface ChangePasswordResponse {
  message: string;
}

export interface DeleteAccountResponse {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/users`;

  /**
   * Update user name
   * @param data Object containing the new name
   * @returns Observable with the response
   */
  updateName(data: UpdateNameRequest): Observable<UpdateNameResponse> {
    return this.http.patch<UpdateNameResponse>(`${this.apiUrl}/update-name`, data);
  }

  /**
   * Update user profile picture
   * @param file Image file to upload
   * @returns Observable with the response containing the new photo URL
   */
  updateProfilePicture(file: File): Observable<UpdateProfilePictureResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.patch<UpdateProfilePictureResponse>(`${this.apiUrl}/profile-picture`, formData);
  }

  /**
   * Change user password
   * @param data Object containing current and new password
   * @returns Observable with the response
   */
  changePassword(data: ChangePasswordRequest): Observable<ChangePasswordResponse> {
    return this.http.patch<ChangePasswordResponse>(`${this.apiUrl}/change-password`, data);
  }

  /**
   * Delete user account
   * @returns Observable with the response
   */
  deleteAccount(): Observable<DeleteAccountResponse> {
    return this.http.delete<DeleteAccountResponse>(`${this.apiUrl}/delete-account`);
  }

  /**
   * Get user profile information
   * @returns Observable with user data
   */
  getProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}/profile`);
  }
}
