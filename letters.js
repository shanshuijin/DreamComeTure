(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LetterRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randomValue(random) {
    const value = Number((random || Math.random)());
    return clamp(Number.isFinite(value) ? value : 0, 0, 0.999999999);
  }

  function normalizedRange(range, fallback) {
    const source = range || {};
    const first = Number(source.min);
    const second = Number(source.max);
    const min = Number.isFinite(first) ? first : fallback.min;
    const max = Number.isFinite(second) ? second : fallback.max;
    return { min: Math.min(min, max), max: Math.max(min, max) };
  }

  function segmentText(segment) {
    return typeof segment === 'string' ? segment : String((segment && segment.text) || '');
  }

  function visibleLength(text) {
    return text.replace(/[，。！？\s]/g, '').length;
  }

  function splitLetterSegments(text) {
    const chunks = String(text || '').trim().match(/[^，。！？]+[，。！？]?|[，。！？]+/g) || [];
    const result = [];
    let leadingShortText = '';

    chunks.forEach(function(chunk) {
      const value = chunk.trim();
      if (!value) return;
      if (visibleLength(value) <= 3) {
        if (result.length) result[result.length - 1] += value;
        else leadingShortText += value;
        return;
      }
      result.push(leadingShortText + value);
      leadingShortText = '';
    });

    if (leadingShortText) {
      if (result.length) result[result.length - 1] += leadingShortText;
      else result.push(leadingShortText);
    }
    return result;
  }

  function selectLetterAnnotations(segments, coverage, cards, cardCountRange, random) {
    const availableSegments = (segments || [])
      .map(function(segment, index) {
        return {
          segmentIndex: segment && Number.isInteger(segment.index) ? segment.index : index,
          text: segmentText(segment).trim(),
        };
      })
      .filter(function(segment) { return segment.text.length > 0; });
    const availableCards = (cards || []).filter(function(card) {
      return card && String(card.text || '').trim().length > 0;
    });
    if (!availableSegments.length || !availableCards.length) return [];

    const coverageRange = normalizedRange(coverage, { min: 25, max: 50 });
    const percent = coverageRange.min + (coverageRange.max - coverageRange.min) * randomValue(random);
    const segmentCount = clamp(Math.round(availableSegments.length * percent / 100), 1, Math.min(5, availableSegments.length));
    const cardsPerRange = normalizedRange(cardCountRange, { min: 1, max: 1 });
    const pool = availableSegments.slice();
    const selected = [];

    while (selected.length < segmentCount && pool.length) {
      const segment = pool.splice(Math.floor(randomValue(random) * pool.length), 1)[0];
      const nCards = Math.round(cardsPerRange.min + (cardsPerRange.max - cardsPerRange.min) * randomValue(random));
      const pickCount = clamp(nCards, 1, Math.min(3, availableCards.length));
      var pickedCards = [];
      for (var j = 0; j < pickCount; j++) {
        var card = availableCards[Math.floor(randomValue(random) * availableCards.length)];
        pickedCards.push(card);
      }
      var combinedText = pickedCards.map(function(c) { return String(c.text).trim(); }).join(' ');
      selected.push({
        id: 'annotation_' + segment.segmentIndex + '_' + selected.length,
        segmentIndex: segment.segmentIndex,
        text: combinedText,
      });
    }
    return selected.sort(function(first, second) { return first.segmentIndex - second.segmentIndex; });
  }

  function scheduleLetterAnnotations(annotations, delayRange, sentAt, random) {
    const range = normalizedRange(delayRange, { min: 5, max: 30 });
    let dueAt = Number(sentAt) || Date.now();
    dueAt += Math.round((range.min + (range.max - range.min) * randomValue(random)) * 60000);
    return (annotations || []).map(function(annotation, index) {
      if (index > 0) dueAt += Math.round((12 + randomValue(random) * 16) * 1000);
      return Object.assign({}, annotation, { dueAt: dueAt, visible: false });
    });
  }

  return {
    splitLetterSegments: splitLetterSegments,
    selectLetterAnnotations: selectLetterAnnotations,
    scheduleLetterAnnotations: scheduleLetterAnnotations,
  };
});
