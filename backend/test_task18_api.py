import unittest
import io
import os
from app import app
from database import init_db, get_db_connection

class Task18BackendTestCase(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        self.client = app.test_client()
        init_db()

        # Create unique test user for testing
        self.test_name = "Test User 18"
        self.test_email = "task18_test@example.com"
        self.test_pass = "password123"
        self.new_pass = "newpassword123"

        # Register or reset test user
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE LOWER(email) IN (?, ?, ?)", (self.test_email, "task18_updated@example.com", "second@example.com"))
        conn.commit()
        conn.close()

        res = self.client.post('/api/register', json={
            "name": self.test_name,
            "email": self.test_email,
            "password": self.test_pass,
            "role": "customer"
        })
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.token = data['access_token']
        self.headers = {'Authorization': f'Bearer {self.token}'}

    def test_01_get_me_returns_profile_structure(self):
        res = self.client.get('/api/me', headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn('id', data)
        self.assertEqual(data['name'], self.test_name)
        self.assertEqual(data['email'], self.test_email)
        self.assertIn('avatar_url', data)
        self.assertIn('created_at', data)
        print("\n[TEST PASS] GET /api/me returns correct user data structure.")

    def test_02_put_me_updates_name_and_email(self):
        updated_name = "Task 18 Updated Name"
        updated_email = "task18_updated@example.com"
        res = self.client.put('/api/me', json={
            "name": updated_name,
            "email": updated_email
        }, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data['message'], 'Profile updated')
        self.assertEqual(data['user']['name'], updated_name)
        self.assertEqual(data['user']['email'], updated_email)
        print("\n[TEST PASS] PUT /api/me successfully updates name and email.")

    def test_03_put_me_duplicate_email_returns_409(self):
        # Register second user
        self.client.post('/api/register', json={
            "name": "Second User",
            "email": "second@example.com",
            "password": "password123"
        })
        # Try updating first user to second user's email
        res = self.client.put('/api/me', json={
            "name": "Should Fail",
            "email": "second@example.com"
        }, headers=self.headers)
        self.assertEqual(res.status_code, 409)
        data = res.get_json()
        self.assertEqual(data['error'], 'Email already in use')
        print("\n[TEST PASS] PUT /api/me with duplicate email returns 409 Conflict.")

    def test_04_password_change_validations_and_401(self):
        # Mismatched passwords -> 400
        res = self.client.put('/api/me/password', json={
            "current_password": self.test_pass,
            "new_password": "short",
            "confirm_password": "short"
        }, headers=self.headers)
        self.assertEqual(res.status_code, 400)

        # Wrong current password -> 401 (CRITICAL REQUIREMENT)
        res = self.client.put('/api/me/password', json={
            "current_password": "WRONG_PASSWORD_123",
            "new_password": self.new_pass,
            "confirm_password": self.new_pass
        }, headers=self.headers)
        self.assertEqual(res.status_code, 401)
        data = res.get_json()
        self.assertEqual(data['error'], 'Current password incorrect')
        print("\n[TEST PASS] PUT /api/me/password with wrong current password returns 401 Unauthorized.")

        # Valid password change -> 200
        res = self.client.put('/api/me/password', json={
            "current_password": self.test_pass,
            "new_password": self.new_pass,
            "confirm_password": self.new_pass
        }, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        print("\n[TEST PASS] PUT /api/me/password updates password successfully.")

        # Verify login works with new password
        login_res = self.client.post('/api/login', json={
            "email": self.test_email,
            "password": self.new_pass
        })
        self.assertEqual(login_res.status_code, 200)
        print("\n[TEST PASS] Login with new password succeeded.")

    def test_05_upload_avatar_and_update_profile(self):
        data = {
            'image': (io.BytesIO(b"fake image bytes"), 'avatar.png')
        }
        res = self.client.put('/api/me/avatar', data=data, content_type='multipart/form-data', headers=self.headers)
        self.assertEqual(res.status_code, 200)
        res_data = res.get_json()
        self.assertIn('avatar_url', res_data)
        self.assertTrue(res_data['avatar_url'].startswith('/static/uploads/'))
        print("\n[TEST PASS] PUT /api/me/avatar uploads picture and updates user avatar_url.")

    def test_06_delete_avatar_resets_to_none(self):
        # Upload avatar first
        data = {
            'image': (io.BytesIO(b"fake image bytes"), 'avatar.png')
        }
        res_upload = self.client.put('/api/me/avatar', data=data, content_type='multipart/form-data', headers=self.headers)
        self.assertEqual(res_upload.status_code, 200)

        # Remove avatar
        res_del = self.client.delete('/api/me/avatar', headers=self.headers)
        self.assertEqual(res_del.status_code, 200)
        res_del_data = res_del.get_json()
        self.assertIsNone(res_del_data['avatar_url'])

        # GET /api/me to verify avatar_url is None
        res_me = self.client.get('/api/me', headers=self.headers)
        self.assertEqual(res_me.get_json()['avatar_url'], None)
        print("\n[TEST PASS] DELETE /api/me/avatar removes picture and resets avatar_url to None.")

if __name__ == '__main__':
    unittest.main()
