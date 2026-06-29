import { describe, expect, it } from 'vitest'

import type { AriaContext, EnforcementOptions } from '../types'
import { ChildrenEvaluator, diagnoseChildren } from '../children'
import {
  audioContract,
  colgroupContract,
  datalistContract,
  detailsContract,
  dlContract,
  fieldsetContract,
  figureContract,
  headContract,
  htmlContract,
  htmlContracts,
  landmarkContract,
  listContract,
  optgroupContract,
  pictureContract,
  selectContract,
  tableBodyContract,
  tableContract,
  tableRowContract,
  videoContract,
  voidContract,
} from './contracts'
import { iterate } from '@praxis-kit/primitive'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function el(tag: string) {
  return { type: tag }
}

function componentEl() {
  return { type: () => null }
}

function check(contract: EnforcementOptions, children: unknown[]) {
  return diagnoseChildren(contract.children!, children)
}

// ─── listContract ─────────────────────────────────────────────────────────────

describe('listContract', () => {
  it('accepts li', () => {
    expect(check(listContract, [el('li')])).toEqual([])
  })

  it('accepts script and template', () => {
    expect(check(listContract, [el('li'), el('script'), el('template')])).toEqual([])
  })

  it('rejects div', () => {
    expect(check(listContract, [el('div')])).toMatchObject([{ kind: 'unexpected' }])
  })
})

// ─── tableContract ────────────────────────────────────────────────────────────

describe('tableContract', () => {
  it('accepts all valid direct children', () => {
    expect(
      check(tableContract, [
        el('caption'),
        el('colgroup'),
        el('thead'),
        el('tbody'),
        el('tfoot'),
        el('tr'),
        el('script'),
      ]),
    ).toEqual([])
  })

  it('rejects div', () => {
    expect(check(tableContract, [el('div')])).toMatchObject([{ kind: 'unexpected' }])
  })

  it('enforces caption must be first', () => {
    const v = check(tableContract, [el('tbody'), el('caption')])
    expect(v).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'position', ruleName: 'caption' })]),
    )
  })

  it('allows caption when it is the only child', () => {
    expect(check(tableContract, [el('caption')])).toEqual([])
  })

  it('rejects two thead elements', () => {
    const v = check(tableContract, [el('thead'), el('thead')])
    expect(v).toMatchObject([{ kind: 'cardinality-max', ruleName: 'thead' }])
  })

  it('rejects two tfoot elements', () => {
    const v = check(tableContract, [el('tfoot'), el('tfoot')])
    expect(v).toMatchObject([{ kind: 'cardinality-max', ruleName: 'tfoot' }])
  })
})

// ─── tableBodyContract ────────────────────────────────────────────────────────

describe('tableBodyContract', () => {
  it('accepts tr and metadata', () => {
    expect(check(tableBodyContract, [el('tr'), el('script'), el('template')])).toEqual([])
  })

  it('rejects td', () => {
    expect(check(tableBodyContract, [el('td')])).toMatchObject([{ kind: 'unexpected' }])
  })
})

// ─── tableRowContract ─────────────────────────────────────────────────────────

describe('tableRowContract', () => {
  it('accepts td, th, and metadata', () => {
    expect(check(tableRowContract, [el('td'), el('th'), el('script'), el('template')])).toEqual([])
  })

  it('rejects tr', () => {
    expect(check(tableRowContract, [el('tr')])).toMatchObject([{ kind: 'unexpected' }])
  })
})

// ─── colgroupContract ─────────────────────────────────────────────────────────

describe('colgroupContract', () => {
  it('accepts col and template', () => {
    expect(check(colgroupContract, [el('col'), el('template')])).toEqual([])
  })

  it('rejects script (not in colgroup content model)', () => {
    expect(check(colgroupContract, [el('script')])).toMatchObject([{ kind: 'unexpected' }])
  })

  it('rejects div', () => {
    expect(check(colgroupContract, [el('div')])).toMatchObject([{ kind: 'unexpected' }])
  })
})

// ─── dlContract ───────────────────────────────────────────────────────────────

describe('dlContract', () => {
  it('accepts dt, dd, div, and metadata', () => {
    expect(
      check(dlContract, [el('dt'), el('dd'), el('div'), el('script'), el('template')]),
    ).toEqual([])
  })

  it('rejects li', () => {
    expect(check(dlContract, [el('li')])).toMatchObject([{ kind: 'unexpected' }])
  })
})

// ─── selectContract ───────────────────────────────────────────────────────────

describe('selectContract', () => {
  it('accepts option, optgroup, hr, and metadata', () => {
    expect(
      check(selectContract, [el('option'), el('optgroup'), el('hr'), el('script'), el('template')]),
    ).toEqual([])
  })

  it('rejects div', () => {
    expect(check(selectContract, [el('div')])).toMatchObject([{ kind: 'unexpected' }])
  })
})

// ─── optgroupContract ─────────────────────────────────────────────────────────

describe('optgroupContract', () => {
  it('accepts option, script, and template', () => {
    expect(check(optgroupContract, [el('option'), el('script'), el('template')])).toEqual([])
  })

  it('rejects nested optgroup', () => {
    expect(check(optgroupContract, [el('optgroup')])).toMatchObject([{ kind: 'unexpected' }])
  })
})

// ─── datalistContract ─────────────────────────────────────────────────────────

describe('datalistContract', () => {
  it('accepts option and metadata', () => {
    expect(check(datalistContract, [el('option'), el('script'), el('template')])).toEqual([])
  })

  it('rejects div', () => {
    expect(check(datalistContract, [el('div')])).toMatchObject([{ kind: 'unexpected' }])
  })
})

// ─── pictureContract ──────────────────────────────────────────────────────────

describe('pictureContract', () => {
  it('accepts source elements before img', () => {
    expect(check(pictureContract, [el('source'), el('img')])).toEqual([])
  })

  it('accepts metadata before img', () => {
    expect(check(pictureContract, [el('script'), el('img')])).toEqual([])
  })

  it('accepts img as the only child', () => {
    expect(check(pictureContract, [el('img')])).toEqual([])
  })

  it('requires exactly one img', () => {
    const v = check(pictureContract, [el('source')])
    expect(v).toMatchObject([{ kind: 'cardinality-min', ruleName: 'image' }])
  })

  it('rejects two img elements', () => {
    const v = check(pictureContract, [el('img'), el('img')])
    expect(v).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'cardinality-max', ruleName: 'image' }),
      ]),
    )
  })

  it('rejects img that is not last', () => {
    const v = check(pictureContract, [el('img'), el('source')])
    expect(v).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'position', ruleName: 'image' })]),
    )
  })
})

// ─── figureContract ───────────────────────────────────────────────────────────

describe('figureContract', () => {
  it('accepts figcaption first followed by flow content', () => {
    expect(check(figureContract, [el('figcaption'), el('img')])).toEqual([])
  })

  it('accepts figcaption last', () => {
    expect(check(figureContract, [el('img'), el('figcaption')])).toEqual([])
  })

  it('accepts flow content with no figcaption', () => {
    expect(check(figureContract, [el('img'), el('p')])).toEqual([])
  })

  it('accepts a component element as content', () => {
    expect(check(figureContract, [componentEl()])).toEqual([])
  })

  it('rejects more than one figcaption', () => {
    const v = check(figureContract, [el('figcaption'), el('figcaption')])
    expect(v).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'cardinality-max', ruleName: 'caption' }),
      ]),
    )
  })
})

// ─── detailsContract ──────────────────────────────────────────────────────────

describe('detailsContract', () => {
  it('accepts summary first followed by flow content', () => {
    expect(check(detailsContract, [el('summary'), el('p')])).toEqual([])
  })

  it('accepts flow content with no summary', () => {
    expect(check(detailsContract, [el('p')])).toEqual([])
  })

  it('rejects summary that is not first', () => {
    const v = check(detailsContract, [el('p'), el('summary')])
    expect(v).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'position', ruleName: 'summary' })]),
    )
  })

  it('rejects more than one summary', () => {
    const v = check(detailsContract, [el('summary'), el('summary')])
    expect(v).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'cardinality-max', ruleName: 'summary' }),
      ]),
    )
  })
})

// ─── fieldsetContract ─────────────────────────────────────────────────────────

describe('fieldsetContract', () => {
  it('accepts legend first followed by form controls', () => {
    expect(check(fieldsetContract, [el('legend'), el('input')])).toEqual([])
  })

  it('accepts form controls with no legend', () => {
    expect(check(fieldsetContract, [el('input')])).toEqual([])
  })

  it('rejects legend that is not first', () => {
    const v = check(fieldsetContract, [el('input'), el('legend')])
    expect(v).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'position', ruleName: 'legend' })]),
    )
  })

  it('rejects more than one legend', () => {
    const v = check(fieldsetContract, [el('legend'), el('legend')])
    expect(v).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'cardinality-max', ruleName: 'legend' }),
      ]),
    )
  })
})

// ─── mediaContract (audio/video) ──────────────────────────────────────────────

describe('audioContract / videoContract', () => {
  it('accepts source, track, metadata, and fallback content in any combination', () => {
    expect(check(audioContract, [el('source'), el('track'), el('script'), el('div')])).toEqual([])
  })

  it('accepts a component element as fallback content', () => {
    expect(check(audioContract, [componentEl()])).toEqual([])
  })

  it('source does not also match the content rule (no ambiguity)', () => {
    expect(check(audioContract, [el('source')])).toEqual([])
  })

  it('audioContract and videoContract are the same object', () => {
    expect(audioContract).toBe(videoContract)
  })
})

// ─── headContract ─────────────────────────────────────────────────────────────

describe('headContract', () => {
  it('accepts all metadata content elements', () => {
    const tags = ['base', 'link', 'meta', 'noscript', 'script', 'style', 'template', 'title']
    expect(check(headContract, tags.map(el))).toEqual([])
  })

  it('rejects div', () => {
    expect(check(headContract, [el('div')])).toMatchObject([{ kind: 'unexpected' }])
  })
})

// ─── htmlContract ─────────────────────────────────────────────────────────────

describe('htmlContract', () => {
  it('accepts exactly one head followed by one body', () => {
    expect(check(htmlContract, [el('head'), el('body')])).toEqual([])
  })

  it('requires head', () => {
    const v = check(htmlContract, [el('body')])
    expect(v).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'cardinality-min', ruleName: 'head' }),
      ]),
    )
  })

  it('requires body', () => {
    const v = check(htmlContract, [el('head')])
    expect(v).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'cardinality-min', ruleName: 'body' }),
      ]),
    )
  })

  it('enforces head must be first', () => {
    const v = check(htmlContract, [el('body'), el('head')])
    expect(v).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'position', ruleName: 'head' })]),
    )
  })

  it('rejects two head elements', () => {
    const v = check(htmlContract, [el('head'), el('head'), el('body')])
    expect(v).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'cardinality-max', ruleName: 'head' }),
      ]),
    )
  })
})

// ─── voidContract ─────────────────────────────────────────────────────────────

describe('voidContract', () => {
  it('has no child rules', () => {
    expect(voidContract.children).toEqual([])
  })

  it('rejects any child via ChildrenEvaluator', () => {
    // diagnoseChildren short-circuits when rules is empty; ChildrenEvaluator enforces correctly.
    const ev = new ChildrenEvaluator(voidContract.children!, 'throw', 'VoidElement')
    expect(() => ev.evaluate([el('span')])).toThrow()
  })
})

// ─── landmarkContract ─────────────────────────────────────────────────────────

describe('landmarkContract', () => {
  const rule = landmarkContract.aria![0]!

  function ctx(
    tag: string,
    props: Record<string, unknown>,
    implicitRole: string | undefined,
  ): AriaContext {
    return { tag, props, implicitRole, effectiveRole: implicitRole } as unknown as AriaContext
  }

  it('returns no results for a non-landmark tag', () => {
    expect(rule(ctx('div', { role: 'banner' }, undefined))).toEqual([])
  })

  it('returns no results when no role prop is set', () => {
    expect(rule(ctx('nav', {}, 'navigation'))).toEqual([])
  })

  it('returns no results when role matches the implicit role', () => {
    // Redundant-role case is handled by the built-in engine, not this rule.
    expect(rule(ctx('nav', { role: 'navigation' }, 'navigation'))).toEqual([])
  })

  it('returns an error when role overrides the landmark role', () => {
    const results = rule(ctx('nav', { role: 'presentation' }, 'navigation'))
    expect(results).toMatchObject([{ valid: false, severity: 'error', fixable: true }])
  })

  it('error message names the tag and both roles', () => {
    const [result] = rule(ctx('nav', { role: 'presentation' }, 'navigation'))
    expect(result!.valid).toBe(false)
    if (!result!.valid) {
      expect(result!.message).toMatch(/nav/)
      expect(result!.message).toMatch(/navigation/)
      expect(result!.message).toMatch(/presentation/)
    }
  })

  it('fix removes role without affecting other props', () => {
    const props = { role: 'presentation', 'aria-label': 'primary nav' }
    const results = rule(ctx('nav', props, 'navigation'))
    const result = results[0]!
    if (!result.valid && result.fixable) {
      const fixed = result.fix.apply(ctx('nav', props, 'navigation'))
      expect(fixed.applied).toBe(true)
      expect(fixed.next).not.toHaveProperty('role')
      expect(fixed.next).toHaveProperty('aria-label', 'primary nav')
    }
  })
})

// ─── htmlContracts map ────────────────────────────────────────────────────────

describe('htmlContracts', () => {
  it('maps list elements to listContract', () => {
    iterate.forEach(['ul', 'ol', 'menu'], (tag) => {
      expect(htmlContracts[tag]).toBe(listContract)
    })
  })

  it('maps table section elements to tableBodyContract', () => {
    iterate.forEach(['thead', 'tbody', 'tfoot'], (tag) => {
      expect(htmlContracts[tag]).toBe(tableBodyContract)
    })
  })

  it('maps void elements to voidContract', () => {
    iterate.forEach(
      ['area', 'br', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track'],
      (tag) => {
        expect(htmlContracts[tag]).toBe(voidContract)
      },
    )
  })

  it('maps landmark elements to landmarkContract', () => {
    iterate.forEach(['article', 'aside', 'footer', 'header', 'main', 'nav'], (tag) => {
      expect(htmlContracts[tag]).toBe(landmarkContract)
    })
  })

  it('maps audio and video to the same media contract', () => {
    expect(htmlContracts['audio']).toBe(htmlContracts['video'])
  })

  it('contains structural contracts by tag', () => {
    expect(htmlContracts['table']).toBe(tableContract)
    expect(htmlContracts['tr']).toBe(tableRowContract)
    expect(htmlContracts['colgroup']).toBe(colgroupContract)
    expect(htmlContracts['picture']).toBe(pictureContract)
    expect(htmlContracts['dl']).toBe(dlContract)
    expect(htmlContracts['select']).toBe(selectContract)
    expect(htmlContracts['optgroup']).toBe(optgroupContract)
    expect(htmlContracts['datalist']).toBe(datalistContract)
    expect(htmlContracts['figure']).toBe(figureContract)
    expect(htmlContracts['details']).toBe(detailsContract)
    expect(htmlContracts['fieldset']).toBe(fieldsetContract)
    expect(htmlContracts['head']).toBe(headContract)
    expect(htmlContracts['html']).toBe(htmlContract)
  })
})
