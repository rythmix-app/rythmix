import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { environment } from '../../../environnements/environment';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService],
    });

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('get', () => {
    it('should make GET request to correct URL', () => {
      const endpoint = '/users';
      const mockResponse = { users: [] };

      service.get(endpoint).subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}${endpoint}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should make GET request with query parameters', () => {
      const endpoint = '/users';
      const params = { search: 'test', role: 'admin', page: '1' };
      const mockResponse = { users: [] };

      service.get(endpoint, params as never).subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(
        (request) =>
          request.url === `${baseUrl}${endpoint}` &&
          request.params.get('search') === 'test' &&
          request.params.get('role') === 'admin' &&
          request.params.get('page') === '1',
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should ignore null and undefined parameters', () => {
      const endpoint = '/users';
      const params = { search: 'test', role: null, page: undefined };
      const mockResponse = { users: [] };

      service.get(endpoint, params as never).subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(
        (request) =>
          request.url === `${baseUrl}${endpoint}` &&
          request.params.get('search') === 'test' &&
          !request.params.has('role') &&
          !request.params.has('page'),
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle GET request errors', (done) => {
      const endpoint = '/users';
      const errorMessage = 'Not Found';

      service.get(endpoint).subscribe({
        error: (error) => {
          expect(error.status).toBe(404);
          expect(error.statusText).toBe('Not Found');
          done();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}${endpoint}`);
      req.flush(errorMessage, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('post', () => {
    it('should make POST request with body', () => {
      const endpoint = '/users';
      const body = { username: 'test', email: 'test@example.com' };
      const mockResponse = { user: { id: '1', ...body } };

      service.post(endpoint, body as never).subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}${endpoint}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });

    it('should make POST request with empty body', () => {
      const endpoint = '/users/1/restore';
      const body = {};
      const mockResponse = { user: { id: '1' } };

      service.post(endpoint, body as never).subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}${endpoint}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });

    it('should handle POST request errors', (done) => {
      const endpoint = '/users';
      const body = { username: 'test' };
      const errorMessage = 'Bad Request';

      service.post(endpoint, body as never).subscribe({
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.statusText).toBe('Bad Request');
          done();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}${endpoint}`);
      req.flush(errorMessage, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('put', () => {
    it('should make PUT request with body', () => {
      const endpoint = '/users/1';
      const body = { username: 'updated', email: 'updated@example.com' };
      const mockResponse = { user: { id: '1', ...body } };

      service.put(endpoint, body as never).subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}${endpoint}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });

    it('should handle PUT request errors', (done) => {
      const endpoint = '/users/1';
      const body = { username: 'updated' };
      const errorMessage = 'Forbidden';

      service.put(endpoint, body as never).subscribe({
        error: (error) => {
          expect(error.status).toBe(403);
          expect(error.statusText).toBe('Forbidden');
          done();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}${endpoint}`);
      req.flush(errorMessage, { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('patch', () => {
    it('should make PATCH request with body', () => {
      const endpoint = '/users/1';
      const body = { username: 'patched' };
      const mockResponse = { user: { id: '1', username: 'patched' } };

      service.patch(endpoint, body as never).subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}${endpoint}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });

    it('should make PATCH request with partial data', () => {
      const endpoint = '/users/1';
      const body = { role: 'admin' };
      const mockResponse = { user: { id: '1', role: 'admin' } };

      service.patch(endpoint, body as never).subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}${endpoint}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });

    it('should handle PATCH request errors', (done) => {
      const endpoint = '/users/1';
      const body = { username: 'taken' };
      const errorMessage = 'Conflict';

      service.patch(endpoint, body as never).subscribe({
        error: (error) => {
          expect(error.status).toBe(409);
          expect(error.statusText).toBe('Conflict');
          done();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}${endpoint}`);
      req.flush(errorMessage, { status: 409, statusText: 'Conflict' });
    });
  });

  describe('delete', () => {
    it('should make DELETE request', () => {
      const endpoint = '/users/1';

      service.delete(endpoint).subscribe((response) => {
        expect(response).toBeNull();
      });

      const req = httpMock.expectOne(`${baseUrl}${endpoint}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should make DELETE request with response body', () => {
      const endpoint = '/users/1/permanent';
      const mockResponse = { message: 'User permanently deleted' };

      service.delete(endpoint).subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}${endpoint}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mockResponse);
    });

    it('should handle DELETE request errors', (done) => {
      const endpoint = '/users/1';
      const errorMessage = 'Unauthorized';

      service.delete(endpoint).subscribe({
        error: (error) => {
          expect(error.status).toBe(401);
          expect(error.statusText).toBe('Unauthorized');
          done();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}${endpoint}`);
      req.flush(errorMessage, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('baseUrl configuration', () => {
    it('should use environment apiUrl as base URL', () => {
      const endpoint = '/test';
      const mockResponse = { data: 'test' };

      service.get(endpoint).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}${endpoint}`);
      expect(req.request.url).toBe(`${environment.apiUrl}${endpoint}`);
      req.flush(mockResponse);
    });
  });
});
