// Polyfill global TextEncoder/TextDecoder for Jest (Node 18+)
if (typeof global.TextEncoder === 'undefined') {
	global.TextEncoder = require('util').TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
	global.TextDecoder = require('util').TextDecoder;
}

const React = require('react');

// Cleanup open handles after each test
afterEach(() => {
	jest.clearAllTimers();
});

// Avoid jsdom layout warnings from Recharts ResponsiveContainer in unit tests.
jest.mock('recharts', () => {
	const actual = jest.requireActual('recharts');
	return {
		...actual,
		ResponsiveContainer: ({ children }) =>
			React.createElement('div', { style: { width: 800, height: 400 } }, children),
	};
});

// Avoid findDOMNode deprecation warnings from react-input-mask in tests.
jest.mock('react-input-mask', () => {
	return ({ children, ...props }) => {
		if (typeof children === 'function') {
			return children(props);
		}
		return React.createElement('input', props);
	};
});
