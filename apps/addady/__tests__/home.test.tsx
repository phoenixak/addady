import { render, screen } from '@testing-library/react-native';

import Home from '../src/app/index';
import ar from '../i18n/ar.json';

describe('Home', () => {
  it('renders the app name, tagline and the unofficial disclaimer', async () => {
    await render(<Home />);
    expect(screen.getByText(ar.app.name)).toBeTruthy();
    expect(screen.getByText(ar.app.tagline)).toBeTruthy();
    expect(screen.getByText(ar.common.unofficial)).toBeTruthy();
  });
});
