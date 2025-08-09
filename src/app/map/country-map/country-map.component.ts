import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, SimpleChanges, ViewChild } from '@angular/core';
import { PlatformService } from '../../core/services/platform.service';
import { HttpClient } from '@angular/common/http';

import * as C from '../../shared/constants';



interface Region {
  code: string;
  name: string;
  population: number;
  imageUrl: string;
  description: string;
}
@Component({
  selector: 'app-country-map',
  standalone: false,
  templateUrl: './country-map.component.html',
  styleUrl: './country-map.component.scss'
})
export class CountryMapComponent implements AfterViewInit {

  @Output() isZoomed = new EventEmitter<boolean>();



  countryCode: string = "";
  countryLayer!: ElementRef<HTMLElement>;

  areas: number[] = [];
  quantileArr: number[] = [];



  //have to add this code to avoid issue with coutnryLayer = undefine when first load this component, this ensure this.countryLayer is referenced after the map is loaded (when ngIf is done)
  @ViewChild('countryLayer', { static: false, read: ElementRef })
  set countryLayerRef(el: ElementRef<HTMLElement>) {
    if (!el) return;
    this.countryLayer = el;
  }


  countrySvg = "";
  regions: Region[] = [];
  selectedRegion: Region | null = null;
  private panZoomInstanceCountry: any;
  private zoomOutHandler: (() => void) | null = null;

  initialZoomLevel: any;

  isLoadingMap = false;

  curMapHeight: number = 0;


  constructor(
    private platform: PlatformService,
    private http: HttpClient

  ) { }


  // ngOnChanges(changes: SimpleChanges) {
  //   if (changes['countryCode'] && this.countryCode != "") {
  //     // this.isZoomed.emit(true);
  //     this.loadCountryMap(this.countryCode);
  //   }
  // }


  ngAfterViewInit(): void {
    if (!this.platform.isBrowser) return;

    // // 🔥 Register zoom handler here:
    // this.zoomOutHandler = () => {
    //   const currentZoom = this.panZoomInstanceCountry!.getZoom();
    //   if (currentZoom < this.initialZoomLevel * 0.6) {
    //     this.backToWorld();
    //   }
    // };
  }

  zoomHandler(newZoom : number) {
    const currentZoom = this.panZoomInstanceCountry!.getZoom();
      if (currentZoom < this.initialZoomLevel * 0.6) {
        this.backToWorld();
      }
  }



  loadCountryMap(code: string, height: number) {
    
    if (this.isLoadingMap) return;
    this.isLoadingMap = true;

    this.curMapHeight = height;
    this.isZoomed.emit(true);
    //reset minmax




    // this.initialZoomLevel = this.panZoomInstanceCountry.getZoom();
    // this.currentCountryCode = code;
    this.selectedRegion = null;

    const url = `assets/maps/countries/${code}/${code}.svg`;

    // this.svgMap.nativeElement.data = `assets/maps/countries/${code}/regions.svg`;

    this.http.get(url, { responseType: 'text' }).subscribe(async svg => {
      // this.svgContent = svg;
      // this.currentCountryCode = code;
      this.countrySvg = svg;

      if (this.panZoomInstanceCountry) {
        this.panZoomInstanceCountry.destroy();
      }

      requestAnimationFrame(() => {
        setTimeout(async () => {
          const svgEl = this.countryLayer.nativeElement.querySelector('svg') as SVGSVGElement;
          if (!svgEl) return;



this.curMapHeight = svgEl.viewBox.baseVal.height;

              // 1) Create a group for each size class
              const sizeClasses = [ 'large', 'medium', 'small'] as const;
              const groups: Record<string, SVGGElement> = {};
              sizeClasses.forEach(cls => {
                const g = document.createElementNS(C.SVG_NS, 'g');
                g.setAttribute('id', `labels-${cls}`);
                // default to no pointer-events; we'll enable on zoom
                // g.setAttribute('pointer-events', 'none');
                svgEl.appendChild(g);
                groups[cls] = g;
              });
          
          
          
          
          
              //add names
              const paths = Array.from(svgEl.querySelectorAll<SVGPathElement>('path[id]'));
              // 1. Compute raw areas
              this.areas = paths.map(p => {
                const b = p.getBBox();
                return b.width * b.height;
              });
              const sorted = [...this.areas].sort((a, b) => a - b);
              // 2. Determine the five quantile boundaries
              const q = (f: number) => sorted[Math.floor(sorted.length * f)];
              this.quantileArr = [0.3, 0.6].map(q);

          //------------------

          this.setupStyles(svgEl);
          const regions = svgEl.querySelectorAll('path[id]') as NodeListOf<SVGPathElement>;
          regions.forEach((path, i) => this.setupRegions(path, i, groups));

          this.setupZoom(svgEl);
          this.isLoadingMap = false;
        }, 0);

      });
    });



  }




  backToWorld() {
    this.isZoomed.emit(false);

    // this.currentCountryCode = null;
    this.countrySvg = '';
    // this.countryCode = '';

    if (this.panZoomInstanceCountry) {

      // Remove zoom listener
      if (this.zoomOutHandler) {
        this.panZoomInstanceCountry?.setOnZoom(() => { });
        // this.zoomOutHandler = null;
      }


    } else {
      // this.currentCountryCode = null;
    }

  }


  async setupZoom(svgEl: SVGSVGElement) {

    if (!this.platform.isBrowser) return;

    const { default: svgPanZoom } = await import('svg-pan-zoom');
    this.panZoomInstanceCountry = svgPanZoom(svgEl, {
      zoomEnabled: true,
      controlIconsEnabled: true,
      minZoom: 0.5,
      maxZoom: 20
    });



    this.initialZoomLevel = this.panZoomInstanceCountry.getZoom();
    this.panZoomInstanceCountry.zoom(this.initialZoomLevel*1.0001);

    //add listtener for zooming out event
    this.panZoomInstanceCountry.setOnZoom((newZoom: number) =>  this.onZoom(svgEl, newZoom));

    this.onZoom(svgEl, this.initialZoomLevel)
  }

  setupRegions(region: SVGPathElement, i: number, groups: Record<string, SVGGElement>) {
    region.setAttribute('fill', '#FFD8A9');
    region.setAttribute('stroke', '#ccc');
    // p.setAttribute('stroke-width', '0.5');

    region.setAttribute('stroke', '#000');
    // p.setAttribute('stroke-width', '0.1');
    region.setAttribute('stroke-linejoin', 'round');
    region.setAttribute('stroke-linecap', 'round');


    const area = this.areas[i];
    let cls = 'small';
    if (area >= this.quantileArr[1]) cls = 'large';
    else if (area >= this.quantileArr[0]) cls = 'medium';



    const code = region.id?.toUpperCase();

    const box = region.getBBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;



    const regionName = region.dataset['name'];
    if (regionName) {
      const title = document.createElementNS(C.SVG_NS, 'title');
      title.textContent = regionName;
      region.appendChild(title);

      const text = document.createElementNS(C.SVG_NS, 'text');
      text.setAttribute('class', `country-label ${cls}`);
      text.setAttribute('x', cx.toString());
      text.setAttribute('y', cy.toString());

      text.setAttribute('role', 'button');           // ARIA
      text.setAttribute('tabindex', '0');            // keyboard focus
      text.style.cursor = 'pointer';                 // show hand cursor
      text.style.pointerEvents = 'all';              // ensure it receives clicks


      text.textContent = regionName;

      text.addEventListener('click', () => this.onRegionClicked(region));
      groups[cls].appendChild(text);

    }

    region.style.cursor = 'pointer';
    region.addEventListener('click', () => this.onRegionClicked(region));
  }

  onRegionClicked(region: SVGPathElement) {
const regionCode = region.id.toUpperCase();
      this.selectedRegion = this.regions.find(r => r.code === regionCode) || null;

  }

  setupStyles(svgEl: SVGSVGElement) {




    svgEl.setAttribute('viewBox', `0 0 ${svgEl.getAttribute('width')} ${svgEl.getAttribute('height')}`);
    // now make it fluid
    svgEl.setAttribute('width', '100%');
    svgEl.setAttribute('height', '100%');
    svgEl.setAttribute('preserveAspectRatio', 'xMidYMid slice');


    const style = document.createElementNS(C.SVG_NS, 'style');
    style.textContent = `
          path {
            transition: fill 0.3s ease, stroke 0.3s ease;
          }
          path:hover {
            fill: #388e3c;
            stroke: #fff;
          stroke-width: var(--hover-stroke) !important;;
            filter: drop-shadow(0 0 2px rgba(0,0,0,0.3));
          }

            svg {
      --label-font: 6px;     /* initial font size */
      --label-opacity: 0;      /* hidden by default */
    }

    /* hover, land, etc… your existing path rules… */

    /* now label rules reference those vars */
    text.country-label {
      font-family: sans-serif;
      font-size: var(--label-font);
      fill: #000;
      text-anchor: middle;
      dominant-baseline: middle;

      /* */
      stroke: #fff;
      stroke-width: var(--label-font-cover);
      paint-order: stroke fill;
      stroke-linejoin: round;
    filter: drop-shadow(0 0 var(--label-font-cover) rgba(0,0,0,0.5));

    }

  text.country-label:hover {
    /* change fill if you want… */
    fill: #e63946;
    /* add a white border */
    stroke: #fff;
    stroke-width: var(--label-font-cover);
    paint-order: stroke fill;
    /* optional drop-shadow for extra pop */
    filter: drop-shadow(0 0 var(--label-font-cover) rgba(0,0,0,0.5));
  }
        `;
    svgEl.appendChild(style);
  }


  onZoom(svgEl: SVGSVGElement, newZoom: number) {
{
      if (newZoom < this.initialZoomLevel * 0.6) {
        this.backToWorld();
      }


      const BASE_FONT = 14 * (this.curMapHeight / 600);       // px at zoom = 1
      const BASE_BORDER_THICKNESS = 0.5;
        const THRESHOLDS = {
          large: 0.5,
          medium: 1.8,
          small: 3.0,
        };        // const sw = baseStroke / newZoom;
        // svgEl.querySelectorAll('path').forEach(p => p.setAttribute('stroke-width', `${sw}`));
        // const landGroup = svgEl.querySelector('#country-map')!;
        let zoomRatio = newZoom;
        let newThick = BASE_BORDER_THICKNESS * zoomRatio;
        // landGroup.setAttribute('stroke-width', `${newThick}px`);

        svgEl.style.setProperty('--hover-stroke', `${newThick}px`);


        //set country label size
        const fontSize = (BASE_FONT * (1 / zoomRatio)).toFixed(1) + 'px';
        const borderFontSize = (BASE_FONT * (0.2 / zoomRatio)).toFixed(1) + 'px';
        // // 3) Apply all six vars in one go
        const s = svgEl.style;
        // new country labels text opacity code
        Object.entries(THRESHOLDS).forEach(([cls, minZoom]) => {
          const grp = svgEl.querySelector<SVGGElement>(`#labels-${cls}`);
          if (!grp) return;
          const visible =  zoomRatio >= minZoom;

          // grp.style.pointerEvents = visible ? 'all' : 'none';
          if (visible) {
            grp.removeAttribute('display');     // back to default (visible)
          } else {
            grp.setAttribute('display', 'none'); // hide + block events
          }

          grp.style.opacity = visible ? '1' : '0';

        });

        // 3) Apply both in one go
        s.setProperty('--label-font', fontSize);
        s.setProperty('--label-font-cover', borderFontSize);



    }
  }
}
