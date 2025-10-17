const createMockResponse = () => {
  const res = {};
  res.statusCode = 200;
  res.body = undefined;
  res.status = jest.fn().mockImplementation((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn().mockImplementation((payload) => {
    res.body = payload;
    return res;
  });
  return res;
};

const createMockRequest = ({ body = {}, params = {}, user = {}, headers = {} } = {}) => ({
  body,
  params,
  user,
  headers,
});

module.exports = {
  createMockResponse,
  createMockRequest,
};
