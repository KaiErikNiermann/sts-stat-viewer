/**
 * English (source) locale — single source of truth for all UI strings.
 *
 * Namespaces: common, dashboard, settings, graphs, errors, update_manager, game_terms
 * Interpolation: {placeholder} syntax, replaced at runtime.
 */
const en = {
  common: {
    save: 'Save',
    saving: 'Saving...',
    cancel: 'Cancel',
    delete: 'Delete',
    retry: 'Retry',
    close_modal: 'Close modal',
    loading: 'Loading...',
  },

  dashboard: {
    page_title: 'STS Stat Viewer',
    heading: 'Slay the Spire Stats',
    subtitle: 'Analyze your runs across all characters',
    overview_tab: 'Overview',
    graphs_heading: 'Graphs',
    reset_defaults: 'Reset to Defaults',
    add_graph_btn: '+ Add Graph',
    loading_data: 'Loading run data...',
    error_loading: 'Error loading data',
    stat_runs: 'Runs:',
    stat_wins: 'Wins:',
    stat_win_rate: 'Win Rate:',
    stat_avg_floor: 'Avg Floor:',
    stat_total_runs: 'Total Runs:',
    stat_max_floor: 'Max Floor:',
  },

  settings: {
    heading: 'Settings',
    settings_tooltip: 'Settings',
    runs_path_label: 'Runs Data Path',
    runs_path_description:
      'Manually specify the path to your Slay the Spire runs folder if auto-detection fails.',
    runs_path_placeholder: '/path/to/SlayTheSpire/runs',
    enter_path_error: 'Please enter a path',
    use_auto_detect: 'Use Auto-Detect',
    status_label: 'Status:',
    path_valid: 'Path valid',
    path_not_found: 'Path not found',
    no_valid_path: 'No valid path',
    mode_label: 'Mode:',
    mode_custom: 'Custom path',
    mode_auto: 'Auto-detected',
    auto_detected_label: 'Auto-detected:',
    switch_to_light: 'Switch to light mode',
    switch_to_dark: 'Switch to dark mode',
    language_label: 'Language',
    language_description: 'Select your preferred display language.',
    language_ai_badge: 'AI-generated',
    language_verified_badge: 'Verified',
  },

  graphs: {
    // Graph type names
    type_scatter: 'Scatter Plot',
    type_histogram: 'Histogram',
    type_survival: 'Survival Curve',
    type_boxplot: 'Box Plot',
    type_regression: 'Regression Plot',
    type_density: 'Density Plot',
    type_waffle: 'Win/Loss Waffle',
    type_relic_table: 'Relic Table',
    type_card_table: 'Card Table',
    type_bar: 'Bar Chart',

    // Configuration labels
    graph_type_label: 'Graph Type',
    x_axis_field: 'X Axis Field',
    y_axis_field: 'Y Axis Field',
    value_field: 'Value Field',
    group_by_field: 'Group By Field',
    custom_title_label: 'Custom Title (optional)',
    title_label: 'Title',
    num_bins: 'Number of Bins',
    bandwidth_label: 'Bandwidth (smoothing)',
    bandwidth_sharp: '5 (sharp)',
    bandwidth_smooth: '100 (smooth)',

    // Checkbox labels
    group_by_character: 'Group by character',
    show_confidence: 'Show 95% confidence interval',
    show_boss_floors_full: 'Show boss floor markers (Act 1, 2, 3, Heart)',
    show_boss_floors_short: 'Show boss floor markers',
    show_normal_curve: 'Show normal distribution curve',

    // Graph type descriptions (modal)
    waffle_description:
      'Shows win/loss ratio as a waffle chart. No additional configuration needed.',
    relic_table_description:
      'Shows a sorted, scrollable table of relics with average floor reached. No additional configuration needed.',
    card_table_description:
      'Shows a sorted, scrollable table of cards with average floor reached. No additional configuration needed.',

    // Modal headings and actions
    add_graph_heading: 'Add New Graph',
    edit_graph_heading: 'Edit Graph',
    add_graph_action: 'Add Graph',
    save_changes: 'Save Changes',
    edit_graph_tooltip: 'Edit graph',
    delete_graph_tooltip: 'Delete graph',
    delete_confirm: 'Delete this graph?',
    drag_to_move: 'Drag to move',

    // Auto-title templates (interpolated)
    auto_title_distribution: '{field} Distribution',
    auto_title_survival_grouped: 'Survival Rate by Character',
    auto_title_survival_overall: 'Overall Survival Rate',
    auto_title_vs: '{x} vs {y}',
    auto_title_by: '{x} by {y}',
    auto_title_trend: '{x} vs {y} (Trend)',
    auto_title_waffle: 'Win/Loss Distribution',
    auto_title_relic_table: 'Relic Performance (Avg Floor Reached)',
    auto_title_card_table: 'Card Performance (Avg Floor Reached)',
    auto_title_density: '{x} vs {y} Density',

    // Axis labels
    axis_count: 'Count',
    axis_floor: 'Floor',
    axis_survival_pct: 'Survival %',
    axis_win_rate_pct: 'Win Rate (%)',
    axis_character: 'Character',

    // Default overview chart titles
    default_win_rate_by_char: 'Win Rate by Character',
    default_avg_floor: 'Average Floor Reached',

    // Field labels (matching PlotFieldKey)
    field_floor_reached: 'Floor Reached',
    field_score: 'Score',
    field_ascension_level: 'Ascension Level',
    field_deck_size: 'Deck Size',
    field_attack_count: 'Attack Cards',
    field_skill_count: 'Skill Cards',
    field_power_count: 'Power Cards',
    field_upgraded_cards: 'Upgraded Cards',
    field_cards_removed: 'Cards Removed',
    field_relic_count: 'Relics',
    field_elites_killed: 'Elites Killed',
    field_bosses_killed: 'Bosses Killed',
    field_campfires_rested: 'Campfires Rested',
    field_campfires_upgraded: 'Campfires Upgraded',
    field_shops_visited: 'Shops Visited',
    field_cards_purchased: 'Cards Purchased',
    field_potions_used: 'Potions Used',
    field_total_damage_taken: 'Total Damage Taken',
    field_max_hp_at_end: 'Max HP at End',

    // Boss floor labels
    boss_act1: 'Act 1 Boss',
    boss_act2: 'Act 2 Boss',
    boss_act3: 'Act 3 Boss',
    boss_heart: 'Heart',

    // Item table
    item_card: 'Card',
    item_relic: 'Relic',
    item_avg_floor: 'Avg Floor',
    item_runs: 'Runs',
    no_card_data: 'No card data available',
    no_relic_data: 'No relic data available',

    // Waffle chart summary
    waffle_summary: 'Each square = {unit} {unitLabel} · Total: {total} runs',

    // Win/loss categories
    victories: 'Victories',
    defeats: 'Defeats',
  },

  errors: {
    network: 'Network error: {message}',
    api: 'API error: {message}',
    unexpected: 'Unexpected error: {message}',
  },

  update_manager: {
    checking: 'Checking for updates...',
    available: 'Update available: v{version}',
    latest: 'You are on the latest version',
    check_failed: 'Failed to check for updates: {error}',
    downloading: 'Downloading update...',
    downloading_progress: 'Downloading ({progress}%)...',
    download_complete: 'Download complete, installing...',
    installed: 'Update installed! Restarting...',
    update_failed: 'Update failed: {error}',
    update_to_tooltip: 'Update to v{version}',
    check_tooltip: 'Check for updates',
    select_version: 'Select version to download',
    current_marker: '(current)',
    downgrade_tooltip: 'Downgrade to older version',
    browser_error: 'Could not open browser. Visit: {url}',
  },

  game_terms: {
    ironclad: 'Ironclad',
    silent: 'Silent',
    defect: 'Defect',
    watcher: 'Watcher',
    run: 'run',
    runs: 'runs',
  },
} as const satisfies Record<string, Record<string, string>>;

export type Messages = typeof en;
export default en;
