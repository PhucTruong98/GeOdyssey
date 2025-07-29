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

    // 🔥 Register zoom handler here:
    this.zoomOutHandler = () => {
      const currentZoom = this.panZoomInstanceCountry!.getZoom();
      if (currentZoom < this.initialZoomLevel * 0.6) {
        this.backToWorld();
      }
    };
  }



  loadCountryMap(code: string) {
    if (this.isLoadingMap) return;
    this.isLoadingMap = true;

    this.isZoomed.emit(true);


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
          this.setupStyles(svgEl);
          const regions = svgEl.querySelectorAll('path[id]') as NodeListOf<SVGPathElement>;
          regions.forEach((path, i) => this.setupRegions(path as SVGPathElement));

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
    // this.panZoomInstanceCountry.zoom(1.3);

    //add listtener for zooming out event
    this.panZoomInstanceCountry.setOnZoom(this.zoomOutHandler);

  }

  setupRegions(region: SVGPathElement) {
    region.setAttribute('fill', '#FFD8A9');
    region.setAttribute('stroke', '#ccc');
    // p.setAttribute('stroke-width', '0.5');

    region.setAttribute('stroke', '#000');
    // p.setAttribute('stroke-width', '0.1');
    region.setAttribute('stroke-linejoin', 'round');
    region.setAttribute('stroke-linecap', 'round');
    const regionName = region.dataset['name'];
    if (regionName) {
      const title = document.createElementNS(C.SVG_NS, 'title');
      title.textContent = regionName;
      region.appendChild(title);
    }

    region.style.cursor = 'pointer';


    region.addEventListener('click', () => {
      const regionCode = region.id.toUpperCase();
      this.selectedRegion = this.regions.find(r => r.code === regionCode) || null;
    });
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
            stroke-width: 1.5;
            filter: drop-shadow(0 0 2px rgba(0,0,0,0.3));
          }
        `;
    svgEl.appendChild(style);
  }
}
