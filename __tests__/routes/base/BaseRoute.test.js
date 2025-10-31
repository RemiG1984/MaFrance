const BaseRoute = require('../../../routes/base/BaseRoute');
const express = require('express');

// Mock dependencies
jest.mock('../../../config/db');
jest.mock('../../../middleware/cache');
jest.mock('../../../middleware/errorHandler');
jest.mock('../../../middleware/validate');

describe('BaseRoute', () => {
  let baseRoute;
  let mockRouter;

  beforeEach(() => {
    mockRouter = {
      get: jest.fn(),
      post: jest.fn()
    };

    // Mock express.Router
    jest.spyOn(express, 'Router').mockReturnValue(mockRouter);

    baseRoute = new BaseRoute({
      enableCache: true,
      cachePrefix: 'test'
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const route = new BaseRoute();
      expect(route.options.enableCache).toBe(false);
      expect(route.options.enableValidation).toBe(true);
    });

    it('should merge provided options with defaults', () => {
      const route = new BaseRoute({ enableCache: true, customOption: 'value' });
      expect(route.options.enableCache).toBe(true);
      expect(route.options.customOption).toBe('value');
      expect(route.options.enableValidation).toBe(true);
    });
  });

  describe('getMiddleware', () => {
    it('should lazy load and cache middleware', () => {
      const mockValidate = jest.fn();
      jest.doMock('../../../middleware/validate', () => mockValidate);

      const middleware = baseRoute.getMiddleware('validate');
      expect(middleware).toBe(mockValidate);

      // Should return cached version on second call
      const middleware2 = baseRoute.getMiddleware('validate');
      expect(middleware2).toBe(mockValidate);
    });

    it('should throw error for unknown middleware', () => {
      expect(() => baseRoute.getMiddleware('unknown')).toThrow('Unknown middleware: unknown');
    });
  });

  describe('createHandler', () => {
    it('should create a handler that wraps async functions', async() => {
      const mockHandler = jest.fn().mockResolvedValue({ data: 'test' });
      const handler = baseRoute.createHandler(mockHandler);

      const mockReq = {};
      const mockRes = { json: jest.fn() };
      const mockNext = jest.fn();

      await handler(mockReq, mockRes, mockNext);

      expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({ data: 'test' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error on handler failure', async() => {
      const mockError = new Error('Test error');
      const mockHandler = jest.fn().mockRejectedValue(mockError);
      const handler = baseRoute.createHandler(mockHandler);

      const mockReq = {};
      const mockRes = { json: jest.fn() };
      const mockNext = jest.fn();

      await handler(mockReq, mockRes, mockNext);

      expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes);
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(mockError);
    });
  });

  describe('get method', () => {
    it('should register GET route with validation and caching', () => {
      const mockHandler = jest.fn();
      const mockValidators = [jest.fn()];

      baseRoute.get('/test', mockHandler, {
        validators: mockValidators,
        cacheKey: () => 'test:key'
      });

      expect(mockRouter.get).toHaveBeenCalled();
      const callArgs = mockRouter.get.mock.calls[0];
      expect(callArgs[0]).toBe('/test');
      // Should have multiple arguments (middleware + handler)
      expect(callArgs.length).toBeGreaterThan(1);
    });

    it('should register GET route without caching when disabled', () => {
      const route = new BaseRoute({ enableCache: false });
      const mockHandler = jest.fn();

      route.get('/test', mockHandler);

      expect(mockRouter.get).toHaveBeenCalledWith('/test', expect.any(Function));
    });
  });

  describe('extractQueryParams', () => {
    it('should extract allowed parameters from request', () => {
      const mockReq = {
        query: {
          param1: 'value1',
          param2: 'value2',
          param3: 'value3'
        }
      };

      const params = baseRoute.extractQueryParams(mockReq, ['param1', 'param3']);
      expect(params).toEqual({
        param1: 'value1',
        param3: 'value3'
      });
    });
  });

  describe('buildWhereClause', () => {
    it('should build WHERE clause from conditions', () => {
      const conditions = {
        name: 'test',
        age: 25,
        active: null // Should be ignored
      };

      const result = baseRoute.buildWhereClause(conditions);
      expect(result.where).toBe('WHERE name = ? AND age = ?');
      expect(result.params).toEqual(['test', 25]);
    });

    it('should return empty where clause for no conditions', () => {
      const result = baseRoute.buildWhereClause({});
      expect(result.where).toBe('');
      expect(result.params).toEqual([]);
    });
  });

  describe('getRouter', () => {
    it('should return the express router', () => {
      expect(baseRoute.getRouter()).toBe(mockRouter);
    });
  });
});