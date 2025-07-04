import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import countryData from '../../assets/data/countries2.json';
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';
import { PlatformService } from '../core/services/platform.service';
import { HttpClient } from '@angular/common/http';


interface Region {
  code: string;
  name: string;
  population: number;
  imageUrl: string;
  description: string;
}

interface Country {
  code: string;
  name: string;
}
@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  standalone: false
})
export class MapComponent implements AfterViewInit {

  @ViewChild('svgContainer', { static: true }) svgContainer!: ElementRef<HTMLObjectElement>;

  currentCountryCode: string | null = null;
  regions: Region[] = [];
  selectedRegion: Region | null = null;
  countryMap: Record<string, string> = {};


  constructor(
    private platform: PlatformService,
    private http: HttpClient
  ) { }

  ngAfterViewInit(): void {
    if (!this.platform.isBrowser) return;

    //build lookup map for countries
    (countryData as Country[]).forEach(c => {
      this.countryMap[c.code.toUpperCase()] = c.name;
    });

    this.loadWorldMap();
    // const svgMap = document.getElementById('svgMap') as HTMLObjectElement;

    // if (svgMap) {
    //   svgMap.addEventListener('load', () => {
    //     const svgDoc = svgMap.contentDocument!;
    //     const countries = svgDoc?.querySelectorAll('path[id]');
    //     const svgEl = svgDoc.documentElement;
    //     svgEl.setAttribute("id", "svgElement");

    //     //have to use this import statement instead of static import up there to avoid window is not define error
    //     import('svg-pan-zoom').then(({ default: svgPanZoom }) => {
    //       const instance = svgPanZoom(svgEl, {
    //         zoomEnabled: true,
    //         controlIconsEnabled: true,
    //         fit: true,
    //         center: true,
    //         minZoom: 0.5,
    //         maxZoom: 20
    //       });
    //     });


    //     // 🔥 Inject hover style into <style> tag
    //     //note, we have to add styling here instead of html because SVG object are loaded as a separate doc, isolated from angular
    //     const style = svgDoc?.createElementNS('http://www.w3.org/2000/svg', 'style');
    //     style!.textContent = `
    //     path {
    //       transition: fill 0.3s ease, stroke 0.3s ease;
    //     }
    //     path:hover {
    //       fill: #1976d2;
    //       stroke: #fff;
    //       stroke-width: 1.5;
    //       filter: drop-shadow(0 0 2px rgba(0,0,0,0.3));
    //     }
    //   `;
    //     svgDoc?.documentElement.appendChild(style!);


    //     //for loop to add click events
    //     countries?.forEach((p: any) => {

    //       //adding tooltips pop-up

    //       const code = p.id?.toUpperCase();
    //       const name = countryMap[code];

    //       if (name) {
    //         const title = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'title');
    //         title.textContent = name;
    //         p.appendChild(title);
    //       }

    //       // done adding tool tips

    //       p.style.cursor = 'pointer';
    //       p.addEventListener('click', () => {
    //         this.loadCountryMap(code);
    //       });
    //     });
    //   });
    // }
  }

  loadCountryMap(code: string) {
    this.currentCountryCode = code;
    this.selectedRegion = null;
    this.svgContainer.nativeElement.data = `assets/maps/countries/${code}/regions.svg`;

    this.http.get<Region[]>(`assets/maps/countries/${code}/regions.json`).subscribe(data => {
      this.regions = data;
    });

    this.svgContainer.nativeElement.onload = () => {
      const svgDoc = this.svgContainer.nativeElement.contentDocument;
      const paths = svgDoc?.querySelectorAll('path[id]');

      //adding hover effect -----

      const style = svgDoc?.createElementNS('http://www.w3.org/2000/svg', 'style');
      style!.textContent = `
  path {
    transition: fill 0.3s ease, stroke 0.3s ease;
  }
  path:hover {
    fill: #43a047;
    stroke: #fff;
    stroke-width: 1.5;
    filter: drop-shadow(0 0 2px rgba(0,0,0,0.3));
  }
`;
      svgDoc?.documentElement.appendChild(style!);
      // ----------/




      paths?.forEach((path: any) => {
        path.style.cursor = 'pointer';
        path.addEventListener('click', () => {
          const regionCode = path.id.toUpperCase();
          this.selectedRegion = this.regions.find(r => r.code === regionCode) || null;
        });
      });
    };
  }

  loadWorldMap() {
    this.currentCountryCode = null;
    this.regions = [];
    this.svgContainer.nativeElement.data = 'assets/maps/world-map-final5.svg';

    this.svgContainer.nativeElement.onload = () => {



      const svgDoc = this.svgContainer.nativeElement.contentDocument;
      const countries = svgDoc?.querySelectorAll('path[id]');


      const svgEl = svgDoc!.documentElement;
    
      svgEl.setAttribute("id", "svgContainer");
svgEl.setAttribute('width', '100%');
svgEl.setAttribute('height', '100%');
svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
     
      //have to use this import statement instead of static import up there to avoid window is not define error
      import('svg-pan-zoom').then(({ default: svgPanZoom }) => {
        const instance = svgPanZoom(svgEl, {
          zoomEnabled: true,
          controlIconsEnabled: true,
          fit: true,
          center: true,
          minZoom: 1,
          maxZoom: 20
        });
      });

      if (!svgEl.getAttribute('viewBox')) {
  const width = svgEl.getAttribute('width') || '1000';
  const height = svgEl.getAttribute('height') || '600';
  svgEl.setAttribute('viewBox', `0 0 ${width} ${height}`);
}
    

      const paths = svgDoc?.querySelectorAll('path[id]');

      // Inject hover style
      const style = svgDoc?.createElementNS('http://www.w3.org/2000/svg', 'style');
      style!.textContent = `
    path {
      transition: fill 0.3s ease, stroke 0.3s ease;
    }
    path:hover {
      fill: #1976d2;
      stroke: #fff;
      stroke-width: 1.5;
      filter: drop-shadow(0 0 2px rgba(0,0,0,0.3));
    }
  `;
      svgDoc?.documentElement.appendChild(style!);

      paths?.forEach((path: any) => {
        //TODO Add tool tips here
        const code = path.id?.toUpperCase();
        const name = this.countryMap[code];

        if (name) {
          const title = svgDoc!.createElementNS('http://www.w3.org/2000/svg', 'title');
          title.textContent = name;
          path.appendChild(title);
        }

        path.style.cursor = 'pointer';
        path.addEventListener('click', () => {
          const code = path.id.toUpperCase();
          this.loadCountryMap(code);
        });
      });
    };

  }

  closeDetail() {
    this.selectedRegion = null;

    this.currentCountryCode = null;
  }

  backToWorld() {
    this.selectedRegion = null;
    this.loadWorldMap();
  }

  showRegionDetail(code: string) {
    this.selectedRegion = this.regions.find(r => r.code === code.toUpperCase()) || null;
  }


}
