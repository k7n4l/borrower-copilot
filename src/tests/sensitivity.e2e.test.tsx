import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

/**
 * Drives a self-employed borrower (Ravi-like: unknown household expenses,
 * no co-applicant confirmed) through to Results, opens the Sensitivity
 * screen, and confirms that moving the co-applicant toggle — via real DOM
 * events, not a direct call into the rules engine — visibly changes the
 * displayed safe amount. This is the exact "change an assumption, watch
 * the app change" behaviour the brief's follow-up interview tests.
 */
describe('Sensitivity screen: live assumption changes are visible in the actual UI', () => {
  it('confirming a co-applicant on the sensitivity screen changes the displayed safe amount', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    fireEvent.click(await screen.findByRole('button', { name: /Business — stock\/equipment/i }));

    let numInput = await screen.findByRole('spinbutton');
    fireEvent.change(numInput, { target: { value: '1500000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    fireEvent.click(await screen.findByRole('button', { name: /Not sure/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Self-employed/i }));

    // monthlyIncomeRange (low/high spinbuttons)
    const rangeInputs = await screen.findAllByRole('spinbutton');
    fireEvent.change(rangeInputs[0], { target: { value: '40000' } });
    fireEvent.change(rangeInputs[1], { target: { value: '80000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // existingMonthlyEMI -> 0
    numInput = await screen.findByRole('spinbutton');
    fireEvent.change(numInput, { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // householdMonthlyExpenses -> unknown
    await screen.findByRole('spinbutton');
    fireEvent.click(screen.getByRole('button', { name: "I don't know" }));

    // ageYears
    numInput = await screen.findByRole('spinbutton');
    fireEvent.change(numInput, { target: { value: '42' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // creditScore -> no_score
    await screen.findByRole('spinbutton');
    fireEvent.click(screen.getByRole('button', { name: /No credit history/i }));

    // recentBounce -> No
    fireEvent.click(await screen.findByRole('button', { name: 'No' }));

    // Skip remaining adaptive questions.
    fireEvent.click(await screen.findByRole('button', { name: /Skip remaining optional questions/i }));

    // On Results now.
    expect(await screen.findByText('Borrow less')).toBeInTheDocument();
    const safeAmountBeforeEl = screen.getByText(/^₹/, { selector: 'p.text-marigold-deep' });
    const safeAmountBefore = safeAmountBeforeEl.textContent ?? '';
    expect(safeAmountBefore).not.toBe('');

    // Open the sensitivity screen.
    fireEvent.click(screen.getByRole('button', { name: /What would change this\?/i }));
    expect(await screen.findByText('Try a different assumption')).toBeInTheDocument();

    // Confirm a co-applicant with a nonzero income via the toggle + slider.
    fireEvent.click(screen.getByRole('button', { name: 'Not confirmed' }));
    const zeroSliders = await screen.findAllByDisplayValue('0');
    const coApplicantSlider = zeroSliders[zeroSliders.length - 1];
    fireEvent.change(coApplicantSlider, { target: { value: '18000' } });

    // The comparison panel intentionally shows both the old (struck-through)
    // and new (highlighted) values when something changed — verify both are
    // present and that they actually differ, proving the recomputation
    // really happened rather than just re-displaying the same number.
    const rows = screen.getAllByText('Safe amount');
    expect(rows.length).toBeGreaterThan(0);
    const comparisonPanel = rows[0].closest('div')?.parentElement;
    expect(comparisonPanel?.textContent).toContain(safeAmountBefore);
    const safeAmountMatches = comparisonPanel?.textContent?.match(/₹[\d,]+/g) ?? [];
    const distinctAmounts = new Set(safeAmountMatches);
    expect(distinctAmounts.size).toBeGreaterThan(1); // at least one figure changed from before to after
  });
});
